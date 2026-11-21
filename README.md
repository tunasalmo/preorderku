# PreOrderKu

**Platform Pre-Order Makanan Kampus**

PreOrderKu adalah aplikasi web yang membantu mahasiswa penjual makanan mengelola pesanan dengan sistem *pre-order H-1*. Pembeli memesan sebelum hari pengambilan, sehingga penjual tahu jumlah yang harus diproduksi sebelum mulai memasak, tanpa kelebihan stok dan tanpa catatan pesanan yang berantakan di chat.

**Live Demo:** https://preorderku.vercel.app

<!--
Tambahkan screenshot di sini setelah file gambar diunggah ke folder docs/, misalnya:

| Halaman pembeli | Dashboard penjual | Laporan |
|---|---|---|
| ![Pembeli](docs/pembeli.png) | ![Dashboard](docs/dashboard.png) | ![Laporan](docs/laporan.png) |
-->

---

## Cara Kerja

1. **Penjual** login dengan email (magic link), membuat pre-order berisi produk, harga, batas stok, deadline, dan lokasi pengambilan.
2. Penjual membagikan **link pre-order** (`/po/[slug]`) ke calon pembeli, misalnya lewat WhatsApp.
3. **Pembeli** membuka link tanpa perlu akun, memilih jumlah produk, mengisi nama dan nomor WhatsApp, lalu memesan. Pembayaran bisa online (Midtrans) atau manual.
4. Sistem menolak pesanan setelah deadline, saat pre-order ditutup, atau saat stok habis.
5. **Penjual** melihat total permintaan per produk, mengelola status bayar dan pengambilan, mengunduh laporan, dan memakai rekomendasi produksi untuk pre-order berikutnya.

---

## Fitur Utama

### Untuk Penjual
- **Autentikasi:** login email dengan Magic Link (Supabase Auth, alur PKCE).
- **Manajemen Pre-Order:** buat pre-order, atur deadline dan lokasi, bagikan link dengan satu klik, dan tutup pre-order kapan saja.
- **Manajemen Produk:** nama, harga, dan batas maksimal stok (opsional) per produk.
- **Dashboard Pesanan:** total permintaan per produk, jumlah pembeli, total pendapatan, dan daftar pesanan lengkap.
- **Status Pesanan:** tandai sudah bayar dan sudah diambil, serta lihat status pembayaran online (menunggu, lunas, gagal).
- **Hubungi Pembeli:** tombol langsung ke WhatsApp tiap pesanan.
- **Laporan Penjualan:** ringkasan porsi per produk, omzet, dan jumlah pembeli, dengan ekspor **CSV**.
- **Rekomendasi Produksi:** saat membuat pre-order baru, sistem menyarankan jumlah produksi per produk dari riwayat pesanan (lihat [Rekomendasi Produksi](#rekomendasi-produksi)).

### Untuk Pembeli
- **Tanpa Login:** pesan langsung lewat link pre-order.
- **Informasi Jelas:** daftar produk, harga, sisa stok, tanggal dan lokasi pengambilan.
- **Hitung Mundur:** countdown menuju batas waktu pemesanan; form otomatis nonaktif setelah deadline atau saat pre-order ditutup.
- **Pembayaran Fleksibel:** bayar online lewat Midtrans (QRIS, GoPay, dan metode lain sesuai pengaturan merchant) atau manual lewat transfer/COD.
- **Status Pembayaran Langsung:** halaman pembeli memperbarui status lunas secara otomatis setelah pembayaran.
- **Dapat Dipasang di HP:** web manifest mendukung tampilan seperti aplikasi (PWA dasar).

---

## Teknologi

| Teknologi | Kegunaan |
|---|---|
| Next.js 14 (App Router) | Framework aplikasi web, server actions, dan API route |
| React 18 | Antarmuka pengguna |
| TypeScript | Kode dengan tipe data |
| Tailwind CSS 3 | Styling dan desain responsif |
| Supabase | Database PostgreSQL, autentikasi, Row Level Security, dan fungsi RPC |
| Midtrans Snap | Payment gateway |
| Vercel | Deployment dan hosting |

Dependensi runtime sengaja dibuat minimal: hanya Next.js, React, dan `@supabase/supabase-js`. Ekspor CSV dibuat sendiri tanpa library tambahan.

---

## Halaman dan Rute

| Rute | Akses | Fungsi |
|---|---|---|
| `/` | Publik | Landing page |
| `/login` | Publik | Login magic link penjual |
| `/auth/callback` | Publik | Penyelesaian login dari link email |
| `/po/[slug]` | Publik | Halaman pemesanan untuk pembeli |
| `/dashboard` | Penjual | Daftar pre-order |
| `/dashboard/new` | Penjual | Buat pre-order baru (dengan rekomendasi produksi) |
| `/dashboard/[id]` | Penjual | Detail pesanan, status, laporan, dan tutup pre-order |
| `/api/midtrans/notification` | Midtrans | Webhook notifikasi pembayaran |

---

## Model Data

Skema lengkap ada di [`supabase/schema.sql`](supabase/schema.sql).

| Tabel | Isi |
|---|---|
| `preorders` | Pre-order milik penjual: slug unik, judul, tanggal dan lokasi ambil, deadline, status (`open` / `closed`) |
| `products` | Produk per pre-order: nama, harga, batas stok (`max_qty`, opsional) |
| `orders` | Pesanan pembeli: nama, WhatsApp, status bayar dan ambil, serta data pembayaran Midtrans |
| `order_items` | Item per pesanan: produk dan jumlah |

---

## Keamanan dan Validasi

Aturan bisnis dijalankan di server dan database, bukan hanya di tampilan:

- **Row Level Security (RLS)** di semua tabel: penjual hanya bisa membaca dan mengubah data pre-order miliknya sendiri.
- **Pesanan hanya lewat RPC `place_order`.** Pembeli tidak punya akses tulis langsung ke tabel. Fungsi ini mengecek status pre-order, deadline, validitas nama dan nomor WhatsApp, jumlah per produk, kepemilikan produk, dan sisa stok.
- **Stok atomik.** `place_order` memakai *advisory lock* per pre-order supaya dua pembeli tidak bisa berebut stok terakhir secara bersamaan.
- **Data publik terbatas.** Halaman pembeli membaca data lewat RPC `get_public_preorder`, bukan akses tabel langsung.
- **Total pembayaran dihitung di server** dari item pesanan dan harga produk di database, bukan dari input browser.
- **Webhook Midtrans diverifikasi.** Signature SHA-512 dicek, jumlah pembayaran dicocokkan dengan pesanan, dan hanya status valid yang diproses.
- **Service role key hanya dipakai di server** (server action dan route webhook), tidak pernah dikirim ke browser.

---

## Alur Pembayaran Midtrans

1. Setelah pesanan masuk, server membuat transaksi Snap dengan nominal yang dihitung ulang dari database.
2. Pembeli membayar lewat popup Snap.
3. Midtrans mengirim notifikasi ke `/api/midtrans/notification`; server memverifikasi signature lalu memperbarui status (`pending`, `paid`, atau `failed`).
4. Sebagai cadangan jika webhook tidak sampai (misalnya saat di localhost), halaman pembeli melakukan polling dan menanyakan status langsung ke Midtrans.

Midtrans bersifat opsional. Jika key tidak diisi, tombol bayar otomatis tidak muncul dan pembeli memakai pembayaran manual.

---

## Rekomendasi Produksi

Saat membuat pre-order baru, PreOrderKu menyarankan jumlah produksi per produk berdasarkan riwayat pesanan. Sistem mengambil rata-rata total pesanan dari tiga pre-order terakhir yang memiliki pesanan, untuk produk dengan nama yang sama, lalu menambah cadangan 10%.

```text
Rekomendasi Produksi = CEILING(rata-rata 3 PO terakhir x 1,10)
```

Contoh: jika tiga pre-order terakhir untuk "Ayam kremes" masing-masing 38, 40, dan 42 porsi, rata-ratanya 40 dan rekomendasinya 44 porsi. Jika belum ada riwayat, sistem menampilkan "Belum ada data".

---

## Struktur Proyek

```text
preorderku/
├── app/
│   ├── page.tsx                      # Landing page
│   ├── login/                        # Halaman login
│   ├── auth/callback/                # Callback magic link
│   ├── dashboard/                    # Dashboard penjual (daftar, buat baru, detail)
│   ├── po/[slug]/                    # Halaman pembeli + server actions
│   ├── api/midtrans/notification/    # Webhook pembayaran
│   └── manifest.ts                   # Web app manifest
├── components/                       # OrderForm, Countdown, CopyLink, Wordmark
├── lib/
│   ├── supabase.ts                   # Klien browser, server, dan service-role
│   ├── midtrans.ts                   # Helper Snap, cek status, verifikasi signature
│   ├── format.ts                     # Format Rupiah, tanggal, dan link WhatsApp
│   └── types.ts                      # Tipe data
├── supabase/
│   └── schema.sql                    # Tabel, RLS, dan fungsi RPC
├── public/fonts/                     # Font Fraunces dan Karla (self-hosted)
├── PRD.md                            # Dokumen kebutuhan produk
├── .env.example
├── .env.local.example
└── package.json
```

---

## Instalasi dan Menjalankan Proyek

### 1. Persyaratan

- Node.js 18.17 atau lebih baru (syarat Next.js 14) dan npm
- Git
- Akun [Supabase](https://supabase.com/) (gratis)
- Akun [Midtrans](https://midtrans.com/) (opsional, mode Sandbox untuk pengujian)

### 2. Clone dan Install

```bash
git clone https://github.com/tunasalmo/preorderku.git
cd preorderku
npm install
```

### 3. Konfigurasi Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**, salin isi `supabase/schema.sql`, lalu jalankan untuk membuat tabel, RLS, dan fungsi RPC. Skema ini aman dijalankan ulang.
3. Buka **Project Settings → API** untuk mengambil URL dan API key.
4. Aktifkan provider **Email** di **Authentication**.
5. Atur **URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

Isi variabel berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Opsional (pembayaran otomatis)
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
```

> **Penting:** `SUPABASE_SERVICE_ROLE_KEY` dan `MIDTRANS_SERVER_KEY` bersifat rahasia. Jangan diunggah ke repository publik dan jangan diekspos ke sisi client. Gunakan `.env.local` yang sudah masuk `.gitignore`.

### 5. Jalankan

```bash
npm run dev
```

Buka `http://localhost:3000`. Untuk build produksi: `npm run build` lalu `npm start`.

---

## Mengaktifkan Pembayaran Midtrans (Opsional)

1. Login ke dashboard Midtrans dan ambil Server Key dan Client Key di **Settings → Access Keys**.
2. Masukkan keduanya ke environment variables. Biarkan `MIDTRANS_IS_PRODUCTION=false` untuk mode Sandbox.
3. Atur **Payment Notification URL** di dashboard Midtrans:

```text
https://domain-anda.com/api/midtrans/notification
```

4. Aktifkan metode pembayaran yang diinginkan, misalnya QRIS atau GoPay.
5. Uji di Sandbox sebelum beralih ke Production.

---

## Deployment ke Vercel

1. Push repository ke GitHub.
2. Import repository di [Vercel](https://vercel.com/).
3. Tambahkan semua environment variables di pengaturan project.
4. Deploy.
5. Tambahkan domain production ke Supabase (**Authentication → URL Configuration**), termasuk redirect `https://domain-anda.vercel.app/auth/callback`.

---

## Informasi Proyek

| Keterangan | Detail |
|---|---|
| Kategori | Web Application |
| Target Pengguna | Mahasiswa penjual makanan kampus dan pembelinya |
| Sistem Pemesanan | Pre-Order H-1 |
| Database | PostgreSQL (Supabase) |
| Hosting | Vercel |

---

## Pengembang

**Saddam Muhammad**, Informatics Engineering, Universitas Pamulang
[GitHub](https://github.com/tunasalmo)

**PreOrderKu: Pesan Lebih Awal, Produksi Lebih Terencana.**
