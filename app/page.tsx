import Link from "next/link";
import Wordmark from "@/components/Wordmark";

const langkah = [
  {
    no: "01",
    judul: "Susun pre-order",
    isi: "Isi menu, harga, tanggal ambil, dan batas waktu pemesanan. Dua menit, selesai.",
  },
  {
    no: "02",
    judul: "Sebar satu tautan",
    isi: "Kirim ke grup WhatsApp kelas atau angkatan. Pembeli membuka tautan, memilih jumlah, isi nama dan nomor.",
  },
  {
    no: "03",
    judul: "Masak sesuai angka",
    isi: "Lihat total porsi per produk, tandai yang sudah bayar dan sudah diambil, lalu tutup PO.",
  },
];

const laporan = [
  ["Total porsi per produk", "Angka yang langsung dipakai untuk belanja bahan."],
  ["Omzet dan jumlah pembeli", "Rekap per PO, tanpa hitung manual di buku."],
  ["Ekspor CSV", "Unduh untuk catatan sendiri atau laporan ke kampus."],
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-5 py-4">
          <Wordmark />
          <Link
            href="/login"
            className="text-[13px] font-semibold text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
          >
            Masuk penjual
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto grid max-w-5xl items-start gap-14 px-5 pb-16 pt-12 md:grid-cols-[1.05fr_0.95fr] md:pb-24 md:pt-20">
          <div className="max-w-xl">
            <p className="label">Pre-order untuk penjual kampus</p>
            <h1 className="mt-5 font-display text-[44px] leading-[0.98] tracking-[-0.025em] sm:text-[54px] md:text-[60px]">
              Masak sesuai <em>pesanan</em>,
              <br />
              bukan tebakan.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-ink-soft">
              Buka pre-order sehari sebelum produksi. Pembeli memesan lewat satu tautan
              tanpa perlu daftar, dan kamu tahu persis berapa porsi yang harus dibuat
              besok pagi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary">
                Mulai jualan
              </Link>
              <a href="#cara" className="btn-ghost">
                Cara kerjanya
              </a>
            </div>

            <p className="mt-6 text-[12px] text-ink-faint">
              Gratis untuk mulai · Pembeli tidak perlu memasang aplikasi
            </p>
          </div>

          {/* contoh nota */}
          <div className="relative md:pl-4">
            <div className="mx-auto w-full max-w-[340px] rotate-[-1.5deg] border border-line bg-paper-2 shadow-slip">
              <div className="flex items-baseline justify-between border-b border-dashed border-line px-5 pb-3 pt-5">
                <span className="label">Nota pre-order</span>
                <span className="font-display text-[13px]">Kamis, 12 Nov</span>
              </div>

              <div className="px-5 pb-5 pt-4">
                <h2 className="font-display text-[21px] leading-[1.2] tracking-[-0.01em]">
                  Nasi ayam kremes
                  <br />
                  <span className="text-ink-soft">sambal matah</span>
                </h2>

                <ul className="mt-5 space-y-2.5 text-[13.5px]">
                  <li className="flex items-baseline">
                    <span>Ayam kremes</span>
                    <span className="leader" />
                    <span className="num">23 × 15.000</span>
                  </li>
                  <li className="flex items-baseline">
                    <span>Nasi uduk</span>
                    <span className="leader" />
                    <span className="num">14 × 5.000</span>
                  </li>
                  <li className="flex items-baseline">
                    <span>Es teh manis</span>
                    <span className="leader" />
                    <span className="num">10 × 4.000</span>
                  </li>
                </ul>

                <div className="mt-5 flex items-baseline justify-between border-t border-line pt-3">
                  <span className="label">Total</span>
                  <span className="font-display text-[17px]">
                    47 porsi · <span className="num">Rp525.000</span>
                  </span>
                </div>

                <dl className="mt-4 space-y-1 text-[12px] text-ink-soft">
                  <div className="flex justify-between">
                    <dt>Batas pesan</dt>
                    <dd className="num">11 Nov, 21.00</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Ambil</dt>
                    <dd>Kantin FEB, lantai 1</dd>
                  </div>
                </dl>
              </div>

              <div
                aria-hidden
                className="h-7 border-t border-line"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(25,23,16,0.7) 0 1px, transparent 1px 3px, rgba(25,23,16,0.7) 3px 4px, transparent 4px 7px, rgba(25,23,16,0.7) 7px 10px, transparent 10px 12px)",
                }}
              />
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-4 right-0 hidden w-[92px] border border-line bg-paper px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-label text-ink-faint md:block"
            >
              Dibuat
              <br />
              dari pesanan
            </div>
          </div>
        </section>

        {/* angka */}
        <section className="border-y border-line">
          <div className="mx-auto grid max-w-5xl divide-y divide-line px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-0">
            {[
              ["H-1", "Pesanan masuk sehari sebelum masak"],
              ["1 tautan", "Dibagikan ke grup WhatsApp kelas"],
              ["0 unduhan", "Pembeli cukup buka lewat browser"],
            ].map(([besar, kecil]) => (
              <div key={besar} className="px-5 py-6">
                <p className="font-display text-[26px] leading-none tracking-[-0.01em]">
                  {besar}
                </p>
                <p className="mt-2 text-[13px] leading-snug text-ink-soft">{kecil}</p>
              </div>
            ))}
          </div>
        </section>

        {/* cara kerja */}
        <section id="cara" className="mx-auto max-w-5xl px-5 py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="label">Cara kerja</p>
              <h2 className="mt-4 font-display text-[32px] leading-[1.05] tracking-[-0.02em] md:text-[40px]">
                Dari tautan
                <br />
                ke dapur.
              </h2>
              <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-ink-soft">
                Semua yang kamu butuhkan untuk memutuskan porsi besok. Tidak lebih.
              </p>
            </div>

            <ol className="divide-y divide-line border-t border-line">
              {langkah.map((item) => (
                <li key={item.no} className="grid gap-2 py-6 sm:grid-cols-[56px_1fr] sm:gap-6">
                  <span className="font-display text-[15px] italic text-accent">
                    {item.no}
                  </span>
                  <div>
                    <h3 className="font-display text-[19px] tracking-[-0.01em]">
                      {item.judul}
                    </h3>
                    <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-ink-soft">
                      {item.isi}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* laporan */}
        <section id="laporan" className="border-t border-line">
          <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="label">Setelah PO ditutup</p>
              <h2 className="mt-4 font-display text-[32px] leading-[1.05] tracking-[-0.02em] md:text-[40px]">
                Angkanya tetap
                <br />
                tersimpan.
              </h2>
              <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-ink-soft">
                Tidak ada rekap ulang dari screenshot chat. Setiap pesanan tercatat dengan
                nama, nomor WhatsApp, dan status bayar serta ambil.
              </p>
            </div>

            <dl className="divide-y divide-line border-y border-line">
              {laporan.map(([judul, isi]) => (
                <div key={judul} className="py-5">
                  <dt className="text-[15px] font-semibold">{judul}</dt>
                  <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{isi}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* penutup */}
        <section className="bg-ink text-paper">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-label text-paper/55">
                Mulai dari satu menu
              </p>
              <h2 className="mt-3 max-w-lg font-display text-[28px] leading-[1.1] tracking-[-0.015em] md:text-[34px]">
                Besok mau masak berapa porsi?
              </h2>
            </div>
            <Link
              href="/login"
              className="btn bg-paper text-ink hover:bg-paper-2"
            >
              Buat pre-order pertama
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <p className="text-[12px] text-ink-faint">
            Untuk penjual makanan kecil di kampus. Pembayaran transfer atau COD.
          </p>
        </div>
      </footer>
    </div>
  );
}
