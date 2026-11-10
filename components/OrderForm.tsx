"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPayment, paymentStatus, placeOrder } from "@/app/po/[slug]/actions";
import { rupiah } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

type Props = {
  slug: string;
  products: PublicProduct[];
  terbuka: boolean;
  catatanTutup: string;
  paymentTersedia: boolean;
  snapJsUrl: string | null;
};

type PayState = {
  orderId: string;
  status: "none" | "pending" | "paid" | "failed" | "busy" | "unknown";
  message?: string;
};

type Sukses = {
  orderId: string;
  nama: string;
  total: number;
  ringkas: string[];
};

const LABEL_BAYAR: Record<string, string> = {
  paid: "Sudah lunas",
  pending: "Menunggu pembayaran",
  failed: "Pembayaran belum selesai",
  unpaid: "Belum dibayar",
  unknown: "Status tidak diketahui",
};

function kunciLokal(slug: string) {
  return `pok:${slug}`;
}

export default function OrderForm({
  slug,
  products,
  terbuka,
  catatanTutup,
  paymentTersedia,
  snapJsUrl,
}: Props) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<Sukses | null>(null);
  const [pay, setPay] = useState<PayState | null>(null);
  const [resume, setResume] = useState<{
    orderId: string;
    status: string;
    nama: string;
    total: number;
  } | null>(null);
  const [pending, mulai] = useTransition();
  const snapDimuat = useRef(false);

  const dipilih = useMemo(() => products.filter((p) => (qty[p.id] ?? 0) > 0), [products, qty]);
  const totalPorsi = dipilih.reduce((a, p) => a + (qty[p.id] ?? 0), 0);
  const totalHarga = dipilih.reduce((a, p) => a + (qty[p.id] ?? 0) * p.price, 0);

  // lanjutkan pesanan terakhir (kalau pembeli menutup halaman sebelum bayar)
  useEffect(() => {
    let aktif = true;
    try {
      const raw = window.localStorage.getItem(kunciLokal(slug));
      if (!raw) return;
      const simpan = JSON.parse(raw) as { orderId: string; nama: string; total: number };
      paymentStatus(simpan.orderId).then((r) => {
        if (aktif && r.status !== "unknown") {
          setResume({ orderId: simpan.orderId, status: r.status, nama: simpan.nama, total: simpan.total });
        }
      });
    } catch {
      /* storage tidak tersedia */
    }
    return () => {
      aktif = false;
    };
  }, [slug]);

  // polling status pembayaran selama masih menunggu
  useEffect(() => {
    if (!pay || pay.status === "paid" || pay.status === "failed") return;
    const orderId = pay.orderId;
    const timer = setInterval(async () => {
      const r = await paymentStatus(orderId);
      const status = r.status === "unpaid" ? "pending" : r.status;
      setPay((prev) => (prev && prev.orderId === orderId ? { ...prev, status } : prev));
    }, 4000);
    return () => clearInterval(timer);
  }, [pay?.orderId, pay?.status]);

  function sisa(p: PublicProduct) {
    return p.max_qty === null ? Infinity : Math.max(p.max_qty - p.sold, 0);
  }

  function setJumlah(p: PublicProduct, nilai: number) {
    const batas = Math.min(sisa(p), 99);
    setQty((prev) => ({ ...prev, [p.id]: Math.max(0, Math.min(nilai, batas)) }));
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

      const ringkas = dipilih.map((p) => `${p.name} ×${qty[p.id]}`);
      setSukses({ orderId: hasil.orderId, nama: nama.trim(), total: totalHarga, ringkas });
      setPay({ orderId: hasil.orderId, status: "pending" });
      setQty({});
      try {
        window.localStorage.setItem(
          kunciLokal(slug),
          JSON.stringify({ orderId: hasil.orderId, nama: nama.trim(), total: totalHarga }),
        );
      } catch {
        /* storage penuh — abaikan */
      }
    });
  }

  async function muatSnap(): Promise<void> {
    if (!snapJsUrl) return;
    const win = window as unknown as { snap?: { pay: (t: string, c: Record<string, unknown>) => void } };
    if (win.snap) return;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = snapJsUrl;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Snap gagal dimuat"));
      document.head.appendChild(s);
    });
    snapDimuat.current = true;
  }

  async function bayar(orderId: string) {
    if (!paymentTersedia || !snapJsUrl) return;
    setPay((prev) => (prev && prev.orderId === orderId ? { ...prev, status: "busy", message: undefined } : prev));
    const hasil = await createPayment(orderId);
    if (!hasil.ok) {
      setPay((prev) => (prev && prev.orderId === orderId ? { ...prev, status: "failed", message: hasil.message } : prev));
      return;
    }
    try {
      await muatSnap();
      const win = window as unknown as { snap: { pay: (t: string, c: Record<string, unknown>) => void } };
      win.snap.pay(hasil.token, {
        // webhook adalah sumber kebenaran; polling yang mengangkat status lunas
        onSuccess: () => {},
        onPending: () => {},
        onClose: () => {},
        onError: () => {
          setPay((prev) =>
            prev && prev.orderId === orderId
              ? { ...prev, status: "failed", message: "Pembayaran batal atau gagal. Coba lagi." }
              : prev,
          );
        },
      });
    } catch {
      setPay((prev) =>
        prev && prev.orderId === orderId
          ? { ...prev, status: "failed", message: "Tidak bisa membuka pembayaran. Coba lagi." }
          : prev,
      );
    }
    setPay((prev) => (prev && prev.orderId === orderId ? { ...prev, status: "pending" } : prev));
  }

  function bersihkanPesanan() {
    setSukses(null);
    setPay(null);
    setQty({});
    try {
      window.localStorage.removeItem(kunciLokal(slug));
    } catch {
      /* abaikan */
    }
  }

  function lanjutkanResume() {
    if (!resume) return;
    setSukses({ orderId: resume.orderId, nama: resume.nama, total: resume.total, ringkas: [] });
    setPay({ orderId: resume.orderId, status: resume.status as PayState["status"] });
    setResume(null);
  }

  // ---------- layar sukses + pembayaran ----------
  if (sukses) {
    const lunas = pay?.status === "paid";
    return (
      <div className="mt-6 border border-line bg-paper-2">
        <div className="border-b border-dashed border-line px-5 py-4">
          <p className="label">Pesanan tercatat</p>
          <p className="mt-2 font-display text-[24px] leading-tight tracking-[-0.015em]">
            Terima kasih, {sukses.nama.split(" ")[0]}.
          </p>
        </div>

        <div className="px-5 py-4">
          {sukses.ringkas.length > 0 && (
            <ul className="space-y-1 text-[13.5px] text-ink-soft">
              {sukses.ringkas.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="label">Total</span>
            <span className="num font-display text-[17px]">{rupiah(sukses.total)}</span>
          </div>

          {/* pembayaran otomatis */}
          <div className="mt-4 border-t border-line pt-4">
            {!paymentTersedia ? (
              <p className="text-[12.5px] leading-relaxed text-ink-faint">
                Pembayaran otomatis belum aktif di toko ini — bayar langsung ke penjual
                (transfer atau COD saat ambil).
              </p>
            ) : lunas ? (
              <div className="flex items-center justify-between gap-3">
                <span className="chip border-olive/40 text-olive">
                  <span aria-hidden className="inline-block h-[5px] w-[5px] rounded-full bg-olive" />
                  Lunas
                </span>
                <span className="text-[12.5px] text-ink-soft">
                  Pembayaran tercatat otomatis. Penjual siapkan pesananmu.
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <span className="label">Pembayaran</span>
                  <span
                    className={
                      "text-[12px] font-semibold " +
                      (pay?.status === "failed" ? "text-accent" : "text-ink-soft")
                    }
                  >
                    {pay?.status === "failed"
                      ? "Belum selesai"
                      : pay?.status === "busy"
                        ? "Menyiapkan…"
                        : "Menunggu"}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={pay?.status === "busy" || pending}
                  onClick={() => sukses && bayar(sukses.orderId)}
                  className="btn-primary mt-3 w-full"
                >
                  {pay?.status === "busy" || pending
                    ? "Menyiapkan pembayaran…"
                    : pay?.status === "failed"
                      ? "Coba bayar lagi"
                      : "Bayar sekarang (QRIS · GoPay)"}
                </button>

                {pay?.message && (
                  <p className="mt-3 border-l-2 border-accent pl-3 text-[12.5px] leading-relaxed text-accent">
                    {pay.message}
                  </p>
                )}

                <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
                  Token pembayaran berlaku 30 menit. Kalau tertunda, pesanan tetap
                  tercatat — kamu bisa melanjutkan pembayaran dari halaman ini nanti.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button type="button" onClick={bersihkanPesanan} className="btn-quiet px-0">
              Pesan lagi
            </button>
            <span className="text-[12px] text-ink-faint">
              Penjual menghubungi lewat WhatsApp yang kamu isi.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} className="mt-6">
      {/* lanjutkan pesanan lama */}
      {resume && (
        <div className="mb-6 border border-line bg-paper-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label">Pesanan terakhirmu</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">
                {resume.nama} · <span className="num">{rupiah(resume.total)}</span>
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-ink-soft">
                {LABEL_BAYAR[resume.status] ?? LABEL_BAYAR.unknown}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {resume.status !== "paid" && (
                <button
                  type="button"
                  onClick={lanjutkanResume}
                  className="btn-primary px-3 py-1.5 text-[13px]"
                >
                  {resume.status === "failed" ? "Bayar ulang" : "Lanjutkan bayar"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setResume(null);
                  try {
                    window.localStorage.removeItem(kunciLokal(slug));
                  } catch {
                    /* abaikan */
                  }
                }}
                className="btn-quiet px-0 text-[12px]"
              >
                Abaikan
              </button>
            </div>
          </div>
        </div>
      )}

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

      {products.length === 0 && (
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
              <p className="num font-display text-[21px] leading-none">{rupiah(totalHarga)}</p>
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
