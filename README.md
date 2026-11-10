# PreOrderKu

Pre-order H-1 untuk penjual makanan kampus. Next.js 14 (App Router) + Tailwind + Supabase.

## 1. Siapkan Supabase

1. Buat project gratis di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel isi [`supabase/schema.sql`](supabase/schema.sql), jalankan. Skrip ini membuat tabel, RLS, dan dua RPC (`get_public_preorder`, `place_order`). Aman dijalankan ulang.
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` dan `https://<domain-vercel>/auth/callback`
4. Pastikan provider **Email** aktif (magic link). Untuk uji cepat, matikan "Confirm email" bila perlu.

## 2. Aktifkan pembayaran (Midtrans, opsional tapi disarankan)

1. Daftar di [midtrans.com](https://midtrans.com) (sandbox langsung aktif).
2. Ambil **Server Key** dan **Client Key** (Settings → Access Keys) — sandbox diawali `SB-Mid-`.
3. Di dashboard Midtrans → Settings → **Payment Notification URL**: isi `<origin>/api/midtrans/notification` (mis. `http://localhost:3000/api/midtrans/notification`).
4. Isi env (lihat di bawah): `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` (dari Supabase → Project Settings → API). Biarkan `MIDTRANS_IS_PRODUCTION` kosong selama sandbox.
5. Aktifkan metode pembayaran (QRIS/GoPay) di dashboard Midtrans. Biaya: QRIS 0,7% per transaksi sukses; VA flat Rp4.000.

Uang pembeli masuk ke rekening yang kamu daftarkan. Status "Lunas" ter-update otomatis lewat webhook. Webhook tidak bisa menjangkau `localhost`, jadi untuk uji lokal status tetap disinkronkan dari polling halaman pembeli yang menanyakan status transaksi langsung ke Midtrans. Tetap isi Notification URL di produksi.

## 3. Jalankan lokal

```bash
cp .env.local.example .env.local   # lalu isi dua nilai di bawah
npm install
npm run dev
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Ambil dari **Project Settings → API**. Buka `http://localhost:3000`, masuk lewat tautan email, lalu buat PO dan bagikan `/po/<slug>`.

```bash
npm run build && npm start   # cek produksi
```

## 4. Deploy Vercel (Hobby, gratis)

1. Push repo ke GitHub, import di [vercel.com/new](https://vercel.com/new). Framework terdeteksi otomatis.
2. Tambahkan di **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`.
3. Deploy, lalu tambahkan `https://<domain>/auth/callback` ke Redirect URLs Supabase.

## Catatan

- Pembeli tanpa akun: halaman publik hanya bisa membaca lewat RPC, dan pesanan hanya masuk lewat `place_order` (cek status, deadline, dan sisa stok di server, dikunci per PO).
- Pembayaran manual (transfer/COD). Status bayar & ambil ditandai di dashboard.
- Laporan CSV dibuat di browser dari data dashboard; rekomendasi produksi = rata-rata 3 PO terakhir untuk produk bernama sama + 10%, dibulatkan ke atas.
