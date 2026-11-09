# PRD: PreOrderKu

Aplikasi pre-order produk untuk mahasiswa penjual di kampus. Pembeli pesan H-1, penjual tahu jumlah produksi sebelum memasak/membuat.

## Instruksi untuk Agent (baca dulu)
- Bangun MVP sesuai PRD ini. Jangan tambah fitur di luar scope.
- Hemat token: jangan jelaskan panjang, jangan ulang isi file, jangan buat dokumentasi tambahan selain README singkat (cara run + deploy).
- Tulis kode langsung, file kecil, tanpa library tambahan di luar daftar Stack.
- Bahasa UI: Indonesia. Mata uang: Rupiah (format `Rp15.000`).
- Selesai per milestone, jalankan `npm run build` sampai lolos, lalu lanjut.

## Stack (semua gratis)
- Next.js 14+ (App Router, TypeScript) + Tailwind CSS
- Supabase (Postgres + Auth magic link) free tier
- Hosting: Vercel Hobby (gratis). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Library hanya: `@supabase/supabase-js`. Grafik/laporan pakai HTML/CSS biasa; ekspor CSV buatan sendiri.

## Pengguna
- **Penjual** (login email magic link): buat PO, lihat permintaan, laporan.
- **Pembeli** (tanpa login): buka link PO, pesan dengan nama + nomor WhatsApp.

## Fitur MVP
1. **Buat Pre-Order (penjual):** judul, tanggal ambil, batas waktu pemesanan (datetime), lokasi ambil, daftar produk (nama, harga, stok maksimal opsional).
2. **Halaman PO publik `/po/[slug]` (pembeli):** lihat produk & harga, hitung mundur batas waktu, pilih jumlah tiap produk, isi nama + WA, kirim pesanan. Setelah batas waktu atau PO ditutup: form nonaktif.
3. **Validasi:** jumlah ≥ 1, tidak melebihi sisa stok, tidak bisa pesan setelah deadline (cek di server/RLS, bukan hanya UI).
4. **Dashboard penjual `/dashboard`:** daftar PO; detail PO menampilkan total permintaan per produk, total pesanan, total pendapatan, daftar pesanan (nama, WA, item, status bayar/ambil), tombol tutup PO.
5. **Laporan:** ringkasan per PO (total porsi per produk, omzet, jumlah pembeli) + ekspor CSV.
6. **Peramalan sederhana:** di form buat PO baru, tampilkan rekomendasi produksi per produk = rata-rata total pesanan 3 PO terakhir produk bernama sama + 10% cadangan (dibulatkan ke atas). Jika belum ada riwayat, tampilkan "Belum ada data".

Contoh: Ayam kremes Rp15.000, 40 pesanan masuk H-1 → penjual produksi 40 porsi (+ cadangan sesuai rekomendasi).

## Model Data (Postgres)
- `preorders`: id, seller_id (auth.users), slug (unik), title, pickup_date, pickup_location, deadline (timestamptz), status (`open`/`closed`), created_at
- `products`: id, preorder_id, name, price (int), max_qty (int null)
- `orders`: id, preorder_id, buyer_name, buyer_phone, paid (bool default false), picked_up (bool default false), created_at
- `order_items`: id, order_id, product_id, qty (int)

RLS:
- Penjual: CRUD hanya data miliknya.
- Publik: SELECT `preorders`/`products` via slug; INSERT `orders`/`order_items` hanya jika PO `open` dan `now() < deadline` (gunakan fungsi RPC `place_order` agar cek stok atomik).

## Halaman
- `/` landing singkat + tombol login
- `/login`
- `/dashboard`, `/dashboard/new`, `/dashboard/[id]`
- `/po/[slug]`

## Non-Fungsional
- Mobile-first, ringan (target <150KB JS halaman pembeli).
- Pembayaran manual (transfer/COD), tidak ada payment gateway.
- Tidak ada notifikasi otomatis; sediakan tombol "Hubungi via WhatsApp" (`https://wa.me/<nomor>`).

## Milestone
1. Setup project, skema SQL + RLS (`supabase/schema.sql`), auth login.
2. CRUD PO + produk, halaman publik pembeli + RPC `place_order`.
3. Dashboard total permintaan, status bayar/ambil, tutup PO.
4. Laporan + ekspor CSV + rekomendasi produksi.
5. README: setup Supabase, env, deploy Vercel.

## Kriteria Selesai
- Penjual bisa membuat PO dan membagikan link.
- Pembeli bisa memesan sebelum deadline dan ditolak setelahnya.
- Dashboard menampilkan total per produk yang akurat.
- CSV terunduh; rekomendasi produksi muncul jika ada riwayat.
- `npm run build` lolos dan bisa di-deploy ke Vercel gratis.

## Di Luar Scope
Payment gateway, chat, multi-kampus, aplikasi native, notifikasi push.
