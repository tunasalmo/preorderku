"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { rupiah, slugify } from "@/lib/format";

type Baris = { key: string; name: string; price: string; max: string };

let urut = 0;
const barisKosong = (): Baris => ({ key: `r${++urut}`, name: "", price: "", max: "" });

function keInputLokal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

export default function NewPreorderPage() {
  const router = useRouter();

  const [judul, setJudul] = useState("");
  const [tanggalAmbil, setTanggalAmbil] = useState("");
  const [deadline, setDeadline] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [baris, setBaris] = useState<Baris[]>([barisKosong()]);

  const [riwayat, setRiwayat] = useState<Record<string, { nama: string; porsi: number }> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  // default tanggal: ambil besok, batas pesan hari ini 21.00 (atau besok bila sudah lewat)
  useEffect(() => {
    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    setTanggalAmbil(
      `${besok.getFullYear()}-${String(besok.getMonth() + 1).padStart(2, "0")}-${String(
        besok.getDate(),
      ).padStart(2, "0")}`,
    );

    const batas = new Date();
    batas.setHours(21, 0, 0, 0);
    if (batas.getTime() <= Date.now()) batas.setDate(batas.getDate() + 1);
    setDeadline(keInputLokal(batas));
  }, []);

  // rekomendasi produksi dari 3 PO terakhir yang punya pesanan
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data } = await supabaseBrowser()
          .from("preorders")
          .select("id, created_at, products(name, order_items(qty))")
          .order("created_at", { ascending: false })
          .limit(10);
        if (!aktif) return;

        type Produk = { name: string; order_items: { qty: number }[] | null };
        const po = (data ?? []) as unknown as { products: Produk[] | null }[];
        const berisi = po.filter((p) => (p.products ?? []).some((pr) => (pr.order_items ?? []).length > 0));
        const sampel = berisi.slice(0, 3);

        const hitung: Record<string, { nama: string; total: number; n: number }> = {};
        for (const p of sampel) {
          for (const pr of p.products ?? []) {
            const qty = (pr.order_items ?? []).reduce((a, b) => a + (b.qty || 0), 0);
            const k = pr.name.trim().toLowerCase();
            if (!k) continue;
            hitung[k] = hitung[k] ?? { nama: pr.name.trim(), total: 0, n: 0 };
            hitung[k].total += qty;
            hitung[k].n += 1;
          }
        }

        const hasil: Record<string, { nama: string; porsi: number }> = {};
        for (const [k, v] of Object.entries(hitung)) {
          if (v.n === 0) continue;
          hasil[k] = { nama: v.nama, porsi: Math.ceil((v.total / v.n) * 1.1) };
        }
        setRiwayat(hasil);
      } catch {
        if (aktif) setRiwayat({});
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const rekomendasi = useMemo(() => Object.values(riwayat ?? {}), [riwayat]);

  function ubah(key: string, patch: Partial<Baris>) {
    setBaris((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function rekomendasiUntuk(nama: string): number | null {
    const k = nama.trim().toLowerCase();
    if (!k || !riwayat) return null;
    return riwayat[k]?.porsi ?? null;
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const produk = baris
      .map((b) => ({
        name: b.name.trim(),
        price: Number.parseInt(b.price || "0", 10),
        max: b.max.trim() === "" ? null : Number.parseInt(b.max, 10),
      }))
      .filter((p) => p.name.length > 0);

    if (judul.trim().length < 3) return setError("Judul pre-order minimal 3 karakter.");
    if (!tanggalAmbil) return setError("Tanggal ambil belum diisi.");
    if (!deadline) return setError("Batas waktu pemesanan belum diisi.");
    const batas = new Date(deadline);
    if (Number.isNaN(batas.getTime()) || batas.getTime() <= Date.now()) {
      return setError("Batas waktu pemesanan harus setelah sekarang.");
    }
    if (lokasi.trim().length < 3) return setError("Lokasi ambil minimal 3 karakter.");
    if (produk.length === 0) return setError("Tambahkan minimal satu produk.");
    if (produk.some((p) => !Number.isFinite(p.price) || p.price < 0)) {
      return setError("Harga produk harus berupa angka, minimal 0.");
    }
    if (produk.some((p) => p.max !== null && (!Number.isFinite(p.max) || p.max < 1))) {
      return setError("Stok maksimal harus angka 1 atau lebih, atau dikosongkan.");
    }

    setMenyimpan(true);
    try {
      const supabase = supabaseBrowser();
      const { data: sesi } = await supabase.auth.getUser();
      if (!sesi.user) {
        setMenyimpan(false);
        return setError("Sesi berakhir. Masuk ulang lalu coba lagi.");
      }

      const slug = `${slugify(judul)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: po, error: errPo } = await supabase
        .from("preorders")
        .insert({
          seller_id: sesi.user.id,
          slug,
          title: judul.trim(),
          pickup_date: tanggalAmbil,
          pickup_location: lokasi.trim(),
          deadline: batas.toISOString(),
          status: "open",
        })
        .select("id")
        .single();

      if (errPo || !po) {
        setMenyimpan(false);
        return setError(`Gagal menyimpan pre-order: ${errPo?.message ?? "tidak diketahui"}`);
      }

      const { error: errProduk } = await supabase.from("products").insert(
        produk.map((p) => ({
          preorder_id: po.id,
          name: p.name,
          price: Math.round(p.price),
          max_qty: p.max,
        })),
      );

      if (errProduk) {
        await supabase.from("preorders").delete().eq("id", po.id);
        setMenyimpan(false);
        return setError(`Gagal menyimpan produk: ${errProduk.message}`);
      }

      router.push(`/dashboard/${po.id}`);
    } catch (err) {
      setMenyimpan(false);
      setError(
        err instanceof Error && /configured/i.test(err.message)
          ? "Supabase belum dikonfigurasi. Isi .env.local lalu jalankan ulang server."
          : "Terjadi kesalahan. Coba lagi.",
      );
    }
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-[12px] text-ink-faint underline decoration-line underline-offset-4 hover:text-ink"
      >
        ← Semua pre-order
      </Link>

      <div className="mt-3">
        <p className="label">Pre-order baru</p>
        <h1 className="mt-2 font-display text-[32px] leading-none tracking-[-0.025em]">
          Susun menu besok
        </h1>
      </div>

      <form onSubmit={simpan} className="mt-8 grid gap-10 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-10">
          <section>
            <h2 className="label border-b border-line pb-2">Detail pre-order</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="judul" className="mb-1.5 block text-[13px] font-semibold">
                  Judul
                </label>
                <input
                  id="judul"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="field"
                  placeholder="Nasi ayam kremes — Kamis"
                  maxLength={90}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ambil" className="mb-1.5 block text-[13px] font-semibold">
                    Tanggal ambil
                  </label>
                  <input
                    id="ambil"
                    type="date"
                    value={tanggalAmbil}
                    onChange={(e) => setTanggalAmbil(e.target.value)}
                    className="field num"
                  />
                </div>

                <div>
                  <label htmlFor="deadline" className="mb-1.5 block text-[13px] font-semibold">
                    Batas waktu pemesanan
                  </label>
                  <input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="field num"
                  />
                </div>
              </div>
              <p className="text-[12px] text-ink-faint">
                Setelah batas ini, form di halaman pembeli tertutup otomatis.
              </p>

              <div>
                <label htmlFor="lokasi" className="mb-1.5 block text-[13px] font-semibold">
                  Lokasi ambil
                </label>
                <input
                  id="lokasi"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  className="field"
                  placeholder="Kantin FEB, lantai 1"
                  maxLength={120}
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between border-b border-line pb-2">
              <h2 className="label">Produk</h2>
              <span className="text-[11px] text-ink-faint">{baris.length} baris</span>
            </div>

            <div className="hidden gap-3 pb-1 pt-3 sm:grid sm:grid-cols-[1fr_120px_120px_32px]">
              <span className="label">Nama</span>
              <span className="label">Harga</span>
              <span className="label">Stok maks</span>
              <span />
            </div>

            {baris.map((b, i) => {
              const rec = rekomendasiUntuk(b.name);
              return (
                <div
                  key={b.key}
                  className="grid gap-2.5 border-b border-line py-3 sm:grid-cols-[1fr_120px_120px_32px] sm:items-start sm:gap-3"
                >
                  <div>
                    <label className="label mb-1 block sm:hidden">Nama produk</label>
                    <input
                      value={b.name}
                      onChange={(e) => ubah(b.key, { name: e.target.value })}
                      className="field"
                      placeholder="Ayam kremes"
                      maxLength={70}
                    />
                    {rec !== null && (
                      <p className="mt-1.5 text-[12px] text-accent">
                        Rekomendasi produksi ≈ {rec} porsi
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label mb-1 block sm:hidden">Harga</label>
                    <input
                      value={b.price}
                      onChange={(e) => ubah(b.key, { price: e.target.value.replace(/[^0-9]/g, "") })}
                      className="field num"
                      inputMode="numeric"
                      placeholder="15000"
                    />
                    <p className="num mt-1.5 text-[11px] text-ink-faint">
                      {b.price ? rupiah(Number(b.price)) : "—"}
                    </p>
                  </div>

                  <div>
                    <label className="label mb-1 block sm:hidden">Stok maksimal</label>
                    <input
                      value={b.max}
                      onChange={(e) => ubah(b.key, { max: e.target.value.replace(/[^0-9]/g, "") })}
                      className="field num"
                      inputMode="numeric"
                      placeholder="tanpa batas"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setBaris((prev) =>
                        prev.length === 1 ? [barisKosong()] : prev.filter((x) => x.key !== b.key),
                      )
                    }
                    aria-label={`Hapus produk ${i + 1}`}
                    className="flex h-11 w-8 items-center justify-center text-[18px] leading-none text-ink-faint transition-colors hover:text-accent"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setBaris((prev) => [...prev, barisKosong()])}
              className="btn-ghost mt-4"
            >
              Tambah produk
            </button>
          </section>

          {error && (
            <p className="border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-accent">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <button type="submit" disabled={menyimpan} className="btn-primary">
              {menyimpan ? "Menyimpan…" : "Simpan & dapatkan tautan"}
            </button>
            <Link href="/dashboard" className="btn-quiet">
              Batal
            </Link>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="border border-line bg-paper-2">
            <div className="border-b border-line px-4 py-3">
              <p className="label">Rekomendasi produksi</p>
            </div>

            <div className="px-4 py-4">
              <p className="text-[12px] leading-relaxed text-ink-soft">
                Rata-rata total pesanan 3 pre-order terakhir untuk produk bernama sama,
                ditambah 10% cadangan.
              </p>

              {riwayat === null ? (
                <p className="mt-4 text-[13px] text-ink-faint">Menghitung…</p>
              ) : rekomendasi.length === 0 ? (
                <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-faint">
                  Belum ada data
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {rekomendasi
                    .sort((a, b) => b.porsi - a.porsi)
                    .map((r) => (
                      <li key={r.nama} className="flex items-baseline justify-between gap-3 py-2.5">
                        <span className="text-[13.5px] leading-snug">{r.nama}</span>
                        <span className="num whitespace-nowrap font-display text-[15px]">
                          {r.porsi} porsi
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-ink-faint">
            Angka ini hanya saran. Stok maksimal tetap jadi batas yang dipakai sistem.
          </p>
        </aside>
      </form>
    </div>
  );
}
