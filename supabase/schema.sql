-- PreOrderKu — skema Supabase (jalankan di SQL Editor, sekali)
-- Postgres + RLS. Publik hanya boleh membaca lewat RPC, menulis pesanan lewat place_order.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tabel
create table if not exists public.preorders (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references auth.users (id) on delete cascade,
  slug            text not null unique,
  title           text not null,
  pickup_date     date not null,
  pickup_location text not null,
  deadline        timestamptz not null,
  status          text not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now()
);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  preorder_id uuid not null references public.preorders (id) on delete cascade,
  name        text not null,
  price       integer not null check (price >= 0),
  max_qty     integer check (max_qty is null or max_qty >= 0)
);

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  preorder_id   uuid not null references public.preorders (id) on delete cascade,
  buyer_name    text not null,
  buyer_phone   text not null,
  paid          boolean not null default false,
  picked_up     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  qty        integer not null check (qty >= 1)
);

create index if not exists preorders_seller_idx  on public.preorders (seller_id, created_at desc);
create index if not exists products_po_idx       on public.products (preorder_id);
create index if not exists orders_po_idx         on public.orders (preorder_id);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_prod_idx  on public.order_items (product_id);

-- ---------------------------------------------------------------- RLS
alter table public.preorders   enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- idempoten: aman dijalankan ulang
drop policy if exists "po_select_own" on public.preorders;
drop policy if exists "po_insert_own" on public.preorders;
drop policy if exists "po_update_own" on public.preorders;
drop policy if exists "po_delete_own" on public.preorders;
drop policy if exists "product_select_own" on public.products;
drop policy if exists "product_insert_own" on public.products;
drop policy if exists "product_update_own" on public.products;
drop policy if exists "product_delete_own" on public.products;
drop policy if exists "order_select_own" on public.orders;
drop policy if exists "order_update_own" on public.orders;
drop policy if exists "order_item_select_own" on public.order_items;

-- preorders: penjual punya datanya sendiri
create policy "po_select_own" on public.preorders
  for select to authenticated using (seller_id = auth.uid());
create policy "po_insert_own" on public.preorders
  for insert to authenticated with check (seller_id = auth.uid());
create policy "po_update_own" on public.preorders
  for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "po_delete_own" on public.preorders
  for delete to authenticated using (seller_id = auth.uid());

-- products: mengikuti pemilik PO
create policy "product_select_own" on public.products
  for select to authenticated using (
    exists (select 1 from public.preorders p where p.id = products.preorder_id and p.seller_id = auth.uid())
  );
create policy "product_insert_own" on public.products
  for insert to authenticated with check (
    exists (select 1 from public.preorders p where p.id = products.preorder_id and p.seller_id = auth.uid())
  );
create policy "product_update_own" on public.products
  for update to authenticated using (
    exists (select 1 from public.preorders p where p.id = products.preorder_id and p.seller_id = auth.uid())
  );
create policy "product_delete_own" on public.products
  for delete to authenticated using (
    exists (select 1 from public.preorders p where p.id = products.preorder_id and p.seller_id = auth.uid())
  );

-- orders: penjual hanya boleh melihat + menandai status. Insert hanya via RPC.
create policy "order_select_own" on public.orders
  for select to authenticated using (
    exists (select 1 from public.preorders p where p.id = orders.preorder_id and p.seller_id = auth.uid())
  );
create policy "order_update_own" on public.orders
  for update to authenticated using (
    exists (select 1 from public.preorders p where p.id = orders.preorder_id and p.seller_id = auth.uid())
  ) with check (
    exists (select 1 from public.preorders p where p.id = orders.preorder_id and p.seller_id = auth.uid())
  );

create policy "order_item_select_own" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      join public.preorders p on p.id = o.preorder_id
      where o.id = order_items.order_id and p.seller_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------- RPC publik
-- Satu query untuk halaman /po/[slug]: PO + produk + jumlah terjual.
create or replace function public.get_public_preorder(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id',              po.id,
    'slug',            po.slug,
    'title',           po.title,
    'pickup_date',     po.pickup_date,
    'pickup_location', po.pickup_location,
    'deadline',        po.deadline,
    'status',          po.status,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',      pr.id,
        'name',    pr.name,
        'price',   pr.price,
        'max_qty', pr.max_qty,
        'sold',    coalesce((
          select sum(oi.qty) from public.order_items oi
          join public.orders o on o.id = oi.order_id
          where oi.product_id = pr.id
        ), 0)::int
      ) order by pr.name)
      from public.products pr
      where pr.preorder_id = po.id
    ), '[]'::jsonb)
  )
  from public.preorders po
  where po.slug = p_slug;
$$;

-- Pesan: cek deadline, status, dan sisa stok secara atomik di server.
create or replace function public.place_order(
  p_slug        text,
  p_buyer_name  text,
  p_buyer_phone text,
  p_items       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_po       public.preorders%rowtype;
  v_order_id uuid;
  v_item     record;
  v_sold     integer;
begin
  select * into v_po from public.preorders where slug = p_slug;
  if not found then
    raise exception 'Pre-order tidak ditemukan.';
  end if;

  -- kunci per PO supaya dua pembeli terakhir tidak berebut stok yang sama
  perform pg_advisory_xact_lock(hashtext(v_po.id::text));

  if v_po.status <> 'open' then
    raise exception 'Pre-order ini sudah ditutup.';
  end if;
  if now() >= v_po.deadline then
    raise exception 'Batas waktu pemesanan sudah lewat.';
  end if;
  if char_length(btrim(coalesce(p_buyer_name, ''))) < 2 then
    raise exception 'Nama minimal 2 karakter.';
  end if;
  if btrim(coalesce(p_buyer_phone, '')) !~ '^[0-9+() -]{8,20}$' then
    raise exception 'Nomor WhatsApp tidak valid.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Belum ada produk yang dipilih.';
  end if;

  insert into public.orders (preorder_id, buyer_name, buyer_phone)
  values (v_po.id, btrim(p_buyer_name), btrim(p_buyer_phone))
  returning id into v_order_id;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
  loop
    if v_item.qty is null or v_item.qty < 1 then
      raise exception 'Jumlah setiap produk minimal 1.';
    end if;
    if v_item.qty > 99 then
      raise exception 'Jumlah per produk terlalu besar.';
    end if;
    if not exists (
      select 1 from public.products where id = v_item.product_id and preorder_id = v_po.id
    ) then
      raise exception 'Produk tidak ditemukan pada pre-order ini.';
    end if;

    select coalesce(sum(oi.qty), 0) into v_sold
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = v_item.product_id and o.preorder_id = v_po.id;

    if exists (
      select 1 from public.products
      where id = v_item.product_id and max_qty is not null and v_sold + v_item.qty > max_qty
    ) then
      raise exception 'Stok tidak cukup untuk produk yang dipilih.';
    end if;

    insert into public.order_items (order_id, product_id, qty)
    values (v_order_id, v_item.product_id, v_item.qty);
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.get_public_preorder(text) from public;
revoke all on function public.place_order(text, text, text, jsonb) from public;
grant execute on function public.get_public_preorder(text) to anon, authenticated;
grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;
