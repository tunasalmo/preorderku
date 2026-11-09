"use client";

import { useMemo, useState, useTransition } from "react";
import { placeOrder } from "@/app/po/[slug]/actions";
import { rupiah } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

type Props = {
  slug: string;
  products: PublicProduct[];
  terbuka: boolean;
  catatanTutup: string;
};

export default function OrderForm({ slug, products, terbuka, catatanTutup }: Props) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<{ nama: string; total: number; ringkas: string[] } | null>(
    null,
  );
  const [pending, mulai] = useTransition();

  const dipilih = useMemo(
    () => products.filter((p) => (qty[p.id] ?? 0) > 0),
    [products, qty],
  );
  const totalPorsi = dipilih.reduce((a, p) => a + (qty[p.id] ?? 0), 0);
  const totalHarga = dipilih.reduce((a, p) => a + (qty[p.id] ?? 0) * p.price, 0);

  function sisa(p: PublicProduct) {
    return p.max_qty === null ? Infinity : Math.max(p.max_qty - p.sold, 0);
  }

  function setJumlah(p: PublicProduct, nilai: number) {
    const batas = Math.min(sisa(p), 99);
    const n = Math.max(0, Math.min(nilai, batas));
    setQty((prev) => ({ ...prev, [p.id]: n }));
    setError(null);
  }

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nama.trim().length < 2) return setError("Isi nama kamu dulu (minimal 2 karakter).");
    if (!/^[0-9+() -]{8,20}$/.test(wa.trim())) {
      return setError("Nomor WhatsApp belum benar. Contoh: 081234567890.");
    }
    if (dipilih.length === 0) return setError("Pilih jumlah untuk minimal satu produk.");

    mulai(async () => {
      const hasil = await placeOrder(slug, {
        name: nama.trim(),
        phone: wa.trim(),
        items: dipilih.map((p) => ({ product_id: p.id, qty: qty[p.id] ?? 0 })),
      });

      if (!hasil.ok) {
        setError(hasil.message);
        return;
      }

      setSukses({
        nama: nama.trim(),
        total: totalHarga,
        ringkas: dipilih.map((p) => `${p.name} ×${qty[p.id]}`),
      });
      setQty({});
    });
  }

  if (sukses) {
    return (
      <div className="mt-6 border border-line bg-paper-2">
        <div className="border-b border-dashed border-line px-5 py-4">
          <p className="label">Pesanan tercatat</p>
          <p className="mt-2 font-display text-[24px] leading-tight tracking-[-0.015em]">
            Terima kasih, {sukses.nama.split(" ")[0]}.
          </p>
        </div>
        <div className="px-5 py-4">
          <ul className="space-y-1 text-[13.5px] text-ink-soft">
            {sukses.ringkas.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="label">Total</span>
            <span className="num font-display text-[17px]">{rupiah(sukses.total)}</span>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
            Pembayaran manual (transfer atau COD). Simpan halaman ini sampai pesanan
            diambil — penjual menghubungi lewat nomor WhatsApp yang kamu isi.
          </p>
          <button
            type="button"
            onClick={() => setSukses(null)}
            className="btn-ghost mt-4 py-1.5 text-[13px]"
          >
            Pesan lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} className="mt-6">
      <ul className="border-t border-line">
        {products.map((p) => {
          const n = qty[p.id] ?? 0;
          const habis = sisa(p) <= 0;
          const maks = n >= Math.min(sisa(p), 99);
          return (
            <li key={p.id} className="border-b border-line py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-snug">{p.name}</p>
                  <p className="num mt-0.5 text-[13px] text-ink-soft">
                    {rupiah(p.price)}
                    {p.max_qty !== null && (
                      <span className="text-ink-faint">
                        {" "}
                        · {habis ? "habis" : `sisa ${sisa(p)}`}
                      </span>
                    )}
                  </p>
                </div>

                <div className="shrink-0">
                  {!terbuka || habis ? (
                    <span className="text-[12px] text-ink-faint">{habis ? "Habis" : "Tutup"}</span>
                  ) : n === 0 ? (
                    <button
                      type="button"
                      onClick={() => setJumlah(p, 1)}
                      className="rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold transition-colors hover:border-ink hover:bg-paper-2"
                    >
                      Tambah
                    </button>
                  ) : (
                    <div className="flex items-center border border-line">
                      <button
                        type="button"
                        onClick={() => setJumlah(p, n - 1)}
                        aria-label={`Kurangi ${p.name}`}
                        className="h-9 w-9 text-[16px] leading-none text-ink-soft transition-colors hover:bg-paper-3"
                      >
                        −
                      </button>
                      <span className="num w-8 text-center text-[14px] font-semibold">{n}</span>
                      <button
                        type="button"
                        disabled={maks}
                        onClick={() => setJumlah(p, n + 1)}
                        aria-label={`Tambah ${p.name}`}
                        className="h-9 w-9 text-[16px] leading-none text-ink-soft transition-colors hover:bg-paper-3 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {produkKosong(products) && (
        <p className="py-6 text-[13.5px] text-ink-faint">Penjual belum menambahkan produk.</p>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="nama" className="mb-1.5 block text-[13px] font-semibold">
            Nama
          </label>
          <input
            id="nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="field"
            placeholder="Nama kamu"
            autoComplete="name"
            maxLength={60}
            disabled={!terbuka}
          />
        </div>

        <div>
          <label htmlFor="wa" className="mb-1.5 block text-[13px] font-semibold">
            Nomor WhatsApp
          </label>
          <input
            id="wa"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            className="field num"
            placeholder="081234567890"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            disabled={!terbuka}
          />
          <p className="mt-1.5 text-[12px] text-ink-faint">
            Dipakai penjual untuk mengabari pesanan kamu.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-accent">
          {error}
        </p>
      )}

      {!terbuka && (
        <p className="mt-4 border-l-2 border-line pl-3 text-[13px] leading-relaxed text-ink-soft">
          {catatanTutup}
        </p>
      )}

      {terbuka && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="label">Total</p>
              <p className="num font-display text-[21px] leading-none">
                {rupiah(totalHarga)}
              </p>
              <p className="mt-1 text-[12px] text-ink-faint">
                {totalPorsi > 0 ? `${totalPorsi} porsi` : "Belum ada yang dipilih"}
              </p>
            </div>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Mengirim…" : "Kirim pesanan"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function produkKosong(products: PublicProduct[]) {
  return products.length === 0;
}
