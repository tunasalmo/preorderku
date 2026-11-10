"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CopyLink from "@/components/CopyLink";
import { supabaseBrowser } from "@/lib/supabase";
import {
  rupiah,
  sisaWaktu,
  tanggalPanjang,
  waLink,
  waktuLengkap,
} from "@/lib/format";
import type { Order, OrderItem, Preorder, Product } from "@/lib/types";

type Pesanan = Order & { order_items: OrderItem[] };
type Detail = Preorder & { products: Product[]; orders: Pesanan[] };

export default function PreorderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<Detail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [asal, setAsal] = useState("");

  useEffect(() => {
    setAsal(window.location.origin);
  }, []);

  const muat = useCallback(async () => {
    if (!id) return;
    const { data: hasil, error } = await supabaseBrowser()
      .from("preorders")
      .select("*, products(*), orders(*, order_items(*))")
      .eq("id", id)
      .maybeSingle();

    setMemuat(false);
    if (error) {
      setPesan("Gagal memuat pre-order.");
      return;
    }
    if (!hasil) {
      setPesan("Pre-order tidak ditemukan atau bukan milik akun ini.");
      return;
    }

    const detail = hasil as unknown as Detail;
    detail.products = [...(detail.products ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    detail.orders = [...(detail.orders ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setData(detail);
  }, [id]);

  useEffect(() => {
    muat();
  }, [muat]);

  const produk = useMemo(() => data?.products ?? [], [data]);

  const terjual = useMemo(() => {
    const peta: Record<string, number> = {};
    for (const o of data?.orders ?? []) {
      for (const it of o.order_items ?? []) {
        peta[it.product_id] = (peta[it.product_id] ?? 0) + it.qty;
      }
    }
    return peta;
  }, [data]);

  const harga = useMemo(() => {
    const peta: Record<string, number> = {};
    for (const p of produk) peta[p.id] = p.price;
    return peta;
  }, [produk]);

  const totalPorsi = Object.values(terjual).reduce((a, b) => a + b, 0);
  const totalOmzet = produk.reduce((sum, p) => sum + (terjual[p.id] ?? 0) * p.price, 0);
  const jumlahPesanan = data?.orders.length ?? 0;

  async function ubahPesanan(orderId: string, patch: Partial<Order>) {
    if (!data) return;
    const lama = data.orders;
    setData({ ...data, orders: lama.map((o) => (o.id === orderId ? { ...o, ...patch } : o)) });

    const { error } = await supabaseBrowser().from("orders").update(patch).eq("id", orderId);
    if (error) {
      setData({ ...data, orders: lama });
      setPesan("Gagal memperbarui status pesanan.");
    }
  }

  async function ubahStatus(status: "open" | "closed") {
    if (!data) return;
    setSibuk(true);
    const { error } = await supabaseBrowser()
      .from("preorders")
      .update({ status })
      .eq("id", data.id);
    setSibuk(false);
    if (error) {
      setPesan("Gagal mengubah status pre-order.");
      return;
    }
    setData({ ...data, status });
  }

  function unduhCsv() {
    if (!data) return;
    const baris: (string | number)[][] = [["Produk", "Harga", "Terjual", "Stok maks", "Omzet"]];
    for (const p of produk) {
      const q = terjual[p.id] ?? 0;
      baris.push([p.name, p.price, q, p.max_qty ?? "", q * p.price]);
    }
    baris.push([]);
    baris.push(["Total porsi", "", totalPorsi, "", ""]);
    baris.push(["Jumlah pesanan", jumlahPesanan, "", "", ""]);
    baris.push(["Omzet total", totalOmzet, "", "", ""]);

    const csv =
      "\uFEFF" +
      baris
        .map((r) => r.map((sel) => `"${String(sel).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${data.slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (memuat) {
    return (
      <div className="border border-line px-4 py-10 text-center text-[13px] text-ink-faint">
        Memuat pre-order…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-dashed border-line bg-paper-2/60 px-6 py-12 text-center">
        <p className="font-display text-[20px]">{pesan ?? "Pre-order tidak ditemukan."}</p>
        <Link href="/dashboard" className="btn-ghost mt-6">
          Kembali ke dashboard
        </Link>
      </div>
    );
  }

  const tautan = `${asal}/po/${data.slug}`;
  const lewat = new Date(data.deadline).getTime() <= Date.now();
  const aktif = data.status === "open" && !lewat;

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-[12px] text-ink-faint underline decoration-line underline-offset-4 hover:text-ink"
      >
        ← Semua pre-order
      </Link>

      {/* kepala */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={
                aktif
                  ? "chip border-olive/40 text-olive"
                  : "chip border-line text-ink-faint"
              }
            >
              {data.status === "closed" ? "Ditutup" : lewat ? "Lewat batas" : "Dibuka"}
            </span>
            <span className="text-[12px] text-ink-faint">{sisaWaktu(data.deadline)}</span>
          </div>
          <h1 className="mt-2 max-w-2xl font-display text-[32px] leading-[1.05] tracking-[-0.025em] md:text-[38px]">
            {data.title}
          </h1>
        </div>
      </div>

      {/* meta */}
      <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          ["Ambil", tanggalPanjang(data.pickup_date)],
          ["Batas pesan", waktuLengkap(data.deadline)],
          ["Lokasi", data.pickup_location],
        ].map(([label, isi]) => (
          <div key={label} className="bg-paper px-4 py-3">
            <p className="label">{label}</p>
            <p className="mt-1 text-[14px] leading-snug">{isi}</p>
          </div>
        ))}
      </div>

      {/* tautan publik */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border border-line bg-paper-2 px-4 py-3">
        <span className="label">Tautan pembeli</span>
        <code className="num min-w-0 flex-1 truncate text-[13px] text-ink-soft">{tautan}</code>
        <CopyLink url={tautan} />
        <a
          href={`/po/${data.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost px-3 py-1.5 text-[13px]"
        >
          Buka
        </a>
      </div>

      {pesan && (
        <p className="mt-4 border-l-2 border-accent pl-3 text-[13px] text-accent">{pesan}</p>
      )}

      {/* ringkasan */}
      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          ["Total porsi", String(totalPorsi)],
          ["Pesanan", String(jumlahPesanan)],
          ["Omzet", rupiah(totalOmzet)],
        ].map(([label, nilai]) => (
          <div key={label} className="bg-paper px-4 py-4">
            <p className="label">{label}</p>
            <p className="num mt-1.5 font-display text-[26px] leading-none tracking-[-0.02em]">
              {nilai}
            </p>
          </div>
        ))}
      </div>

      {/* per produk */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between border-b border-line pb-2">
          <h2 className="label">Permintaan per produk</h2>
          <span className="text-[11px] text-ink-faint">{produk.length} produk</span>
        </div>

        {produk.length === 0 ? (
          <p className="py-6 text-[13.5px] text-ink-faint">Belum ada produk.</p>
        ) : (
          <div>
            <div className="hidden grid-cols-[1fr_100px_90px_90px_90px_110px] gap-3 border-b border-line py-2 sm:grid">
              <span className="label">Produk</span>
              <span className="label text-right">Harga</span>
              <span className="label text-right">Dipesan</span>
              <span className="label text-right">Stok</span>
              <span className="label text-right">Sisa</span>
              <span className="label text-right">Omzet</span>
            </div>

            <ul className="divide-y divide-line">
              {produk.map((p) => {
                const q = terjual[p.id] ?? 0;
                const sisa = p.max_qty === null ? null : Math.max(p.max_qty - q, 0);
                const persen = p.max_qty ? Math.min(100, Math.round((q / p.max_qty) * 100)) : 0;
                return (
                  <li key={p.id} className="py-3">
                    <div className="grid gap-1 sm:grid-cols-[1fr_100px_90px_90px_90px_110px] sm:items-center sm:gap-3">
                      <div>
                        <p className="text-[14.5px] font-semibold leading-snug">{p.name}</p>
                        <div className="mt-1.5 flex items-center gap-2 sm:hidden">
                          <span className="num text-[12.5px] text-ink-soft">
                            {q} dipesan · {p.max_qty === null ? "tanpa batas" : `${sisa} sisa`}
                          </span>
                          <span className="num text-[12.5px] text-ink-soft">
                            · {rupiah(q * p.price)}
                          </span>
                        </div>
                        {p.max_qty !== null && (
                          <div className="mt-1.5 hidden h-[3px] w-32 bg-paper-3 sm:block">
                            <div
                              className="h-full bg-olive"
                              style={{ width: `${persen}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <span className="num hidden text-right text-[13.5px] sm:block">
                        {rupiah(p.price)}
                      </span>
                      <span className="num hidden text-right text-[13.5px] font-semibold sm:block">
                        {q}
                      </span>
                      <span className="num hidden text-right text-[13.5px] text-ink-soft sm:block">
                        {p.max_qty ?? "—"}
                      </span>
                      <span className="num hidden text-right text-[13.5px] text-ink-soft sm:block">
                        {sisa ?? "—"}
                      </span>
                      <span className="num hidden text-right text-[13.5px] sm:block">
                        {rupiah(q * p.price)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* pesanan */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between border-b border-line pb-2">
          <h2 className="label">Pesanan masuk</h2>
          <button
            type="button"
            onClick={unduhCsv}
            className="text-[12px] text-ink-soft underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink"
          >
            Unduh CSV
          </button>
        </div>

        {jumlahPesanan === 0 ? (
          <p className="py-8 text-[13.5px] text-ink-faint">
            Belum ada pesanan. Bagikan tautan pembeli di atas.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {(data.orders ?? []).map((o) => {
              const total = (o.order_items ?? []).reduce(
                (sum, it) => sum + it.qty * (harga[it.product_id] ?? 0),
                0,
              );
              return (
                <li key={o.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-[17px] leading-snug tracking-[-0.01em]">
                        {o.buyer_name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-faint">
                        <span className="num">{o.buyer_phone}</span>
                        <span>·</span>
                        <span>{waktuLengkap(o.created_at)}</span>
                        <a
                          href={waLink(o.buyer_phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    <p className="num font-display text-[16px]">{rupiah(total)}</p>
                  </div>

                  <ul className="mt-2 space-y-1 text-[13.5px] text-ink-soft">
                    {(o.order_items ?? []).map((it) => {
                      const p = produk.find((x) => x.id === it.product_id);
                      return (
                        <li key={it.id} className="flex items-baseline gap-2">
                          <span className="num text-ink">{it.qty}×</span>
                          <span className="flex-1">{p?.name ?? "Produk dihapus"}</span>
                          <span className="num">{rupiah(it.qty * (p?.price ?? 0))}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(o.paid || o.payment_status === "paid") && (
                      <span className="chip border-olive/40 text-olive">
                        Lunas{o.payment_method ? ` · ${o.payment_method}` : ""}
                      </span>
                    )}
                    {o.payment_status === "pending" && (
                      <span className="chip border-line text-ink-soft">Menunggu bayar</span>
                    )}
                    {o.payment_status === "failed" && (
                      <span className="chip border-accent/40 text-accent">Bayar gagal</span>
                    )}
                    {o.payment_status === "unpaid" && !o.paid && (
                      <span className="chip border-line text-ink-faint">Belum bayar</span>
                    )}
                    {(
                      [
                        ["paid", "Sudah bayar", o.paid],
                        ["picked_up", "Sudah diambil", o.picked_up],
                      ] as const
                    ).map(([field, label, nilai]) => (
                      <button
                        key={field}
                        type="button"
                        aria-pressed={nilai}
                        onClick={() =>
                          field === "paid"
                            ? ubahPesanan(o.id, {
                                paid: !nilai,
                                payment_status: nilai ? "unpaid" : "paid",
                                payment_method: !nilai && !o.payment_method ? "manual" : o.payment_method,
                              })
                            : ubahPesanan(o.id, { picked_up: !nilai })
                        }
                        className={
                          "chip transition-colors " +
                          (nilai
                            ? "border-olive bg-olive text-paper-2"
                            : "border-line text-ink-faint hover:border-ink-faint hover:text-ink")
                        }
                      >
                        {nilai ? "✓ " : ""}
                        {label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* aksi */}
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {data.status === "open" ? (
          <button
            type="button"
            disabled={sibuk}
            onClick={() => ubahStatus("closed")}
            className="btn-ghost"
          >
            Tutup pre-order
          </button>
        ) : (
          <button
            type="button"
            disabled={sibuk}
            onClick={() => ubahStatus("open")}
            className="btn-ghost"
          >
            Buka lagi
          </button>
        )}
        <button type="button" onClick={unduhCsv} className="btn-primary">
          Unduh laporan CSV
        </button>
        <span className="text-[12px] text-ink-faint">
          Pembayaran manual: transfer atau COD saat ambil.
        </span>
      </div>
    </div>
  );
}
