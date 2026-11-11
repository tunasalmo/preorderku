# PreOrderKu

**Platform Pre-Order Makanan Kampus**

PreOrderKu adalah aplikasi berbasis web yang membantu mahasiswa penjual makanan mengelola pemesanan makanan menggunakan sistem *pre-order H-1*. Dengan sistem ini, pembeli dapat memesan makanan sebelum hari pengambilan, sementara penjual dapat mengetahui jumlah pesanan lebih awal sehingga proses persiapan dan produksi menjadi lebih terencana.

🌐 **Live Demo:** https://preorderku.vercel.app

---

## ✨ Fitur Utama

### Untuk Penjual
- **Autentikasi:** Login menggunakan email dengan sistem Magic Link.
- **Manajemen Pre-Order:** Membuat, mengelola, dan menutup periode pre-order.
- **Manajemen Produk:** Mengatur nama produk, harga, dan batas maksimal stok.
- **Dashboard Pesanan:** Melihat daftar pesanan, jumlah produk, total pembeli, dan pendapatan.
- **Status Pesanan:** Mengelola status pembayaran dan pengambilan pesanan.
- **Laporan Penjualan:** Melihat ringkasan transaksi dan mengunduh laporan dalam format CSV.
- **Rekomendasi Produksi:** Menghitung estimasi jumlah produksi berdasarkan rata-rata tiga periode pre-order terakhir ditambah cadangan 10%.

### Untuk Pembeli
- **Akses Tanpa Login:** Memesan makanan langsung melalui tautan pre-order.
- **Informasi Produk:** Melihat daftar makanan, harga, dan ketersediaan stok.
- **Pemesanan Online:** Memilih jumlah produk dan mengisi nama serta nomor WhatsApp.
- **Batas Waktu Pemesanan:** Sistem otomatis menonaktifkan pemesanan setelah deadline atau ketika pre-order ditutup.
- **Informasi Pengambilan:** Melihat tanggal dan lokasi pengambilan pesanan.
- **Pembayaran:** Mendukung pembayaran manual melalui transfer/COD serta integrasi Midtrans.

---

## 🛠️ Teknologi

| Teknologi | Kegunaan |
|---|---|
| Next.js 14 | Framework aplikasi web |
| React 18 | Library antarmuka pengguna |
| TypeScript | Pengembangan JavaScript dengan tipe data |
| Tailwind CSS 3 | Styling dan desain responsif |
| Supabase | Backend, database PostgreSQL, dan autentikasi |
| Midtrans | Integrasi payment gateway |
| Vercel | Deployment dan hosting |

---

## 📂 Struktur Proyek

```text
preorderku/
├── app/                  # Halaman dan API routes
├── components/           # Komponen UI
├── lib/                  # Konfigurasi dan helper
├── public/               # Asset statis
├── supabase/
│   └── schema.sql        # Database schema, RLS, dan RPC
├── .env.example
├── .env.local.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 🚀 Instalasi dan Menjalankan Proyek

### 1. Persyaratan

Pastikan perangkat sudah memiliki:
- Node.js
- npm
- Git
- Akun Supabase

### 2. Clone Repository

```bash
git clone https://github.com/tunasalmo/preorderku.git
```

Masuk ke direktori proyek:

```bash
cd preorderku
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Konfigurasi Supabase

1. Buat project baru melalui [Supabase](https://supabase.com/).
2. Buka menu **SQL Editor**.
3. Salin isi file `supabase/schema.sql`.
4. Jalankan SQL untuk membuat tabel, Row Level Security (RLS), dan fungsi RPC.
5. Buka **Project Settings → API** untuk mendapatkan URL dan API Key.
6. Aktifkan provider Email pada pengaturan Authentication.

Atur konfigurasi URL autentikasi:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

### 5. Konfigurasi Environment Variables

Salin file konfigurasi:

```bash
cp .env.local.example .env.local
```

Kemudian sesuaikan variabel berikut dengan kredensial masing-masing layanan:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
```

**Catatan:** 
- Kredensial Supabase dapat diperoleh dari Project Settings → API.
- Midtrans bersifat opsional dan dapat menggunakan mode Sandbox untuk pengujian.
- `SUPABASE_SERVICE_ROLE_KEY` dan `MIDTRANS_SERVER_KEY` merupakan kredensial rahasia. Jangan pernah mengeksposnya ke sisi client atau mengunggahnya ke repository publik.

### 6. Jalankan Aplikasi

```bash
npm run dev
```

Buka aplikasi melalui browser:

```text
http://localhost:3000
```

---

## 💳 Integrasi Pembayaran Midtrans

PreOrderKu mendukung integrasi Midtrans untuk memproses pembayaran secara online.

Langkah konfigurasi:

1. Daftar atau login melalui [Midtrans](https://midtrans.com/).
2. Ambil Server Key dan Client Key melalui menu Access Keys.
3. Masukkan kredensial ke environment variables.
4. Atur Payment Notification URL pada dashboard Midtrans:

```text
https://your-domain.com/api/midtrans/notification
```

5. Aktifkan metode pembayaran yang ingin digunakan, seperti QRIS atau GoPay.
6. Gunakan mode Sandbox untuk pengujian sebelum beralih ke Production.

Status pembayaran akan diperbarui melalui mekanisme notifikasi webhook Midtrans.

---

## 🌐 Deployment ke Vercel

PreOrderKu dapat di-deploy menggunakan Vercel.

1. Push repository ke GitHub.
2. Buka [Vercel](https://vercel.com/).
3. Import repository `preorderku`.
4. Tambahkan seluruh Environment Variables yang diperlukan.
5. Jalankan deployment.
6. Tambahkan URL production pada Supabase Authentication → URL Configuration, termasuk redirect:

```text
https://your-domain.vercel.app/auth/callback
```

Setelah deployment berhasil, aplikasi dapat diakses melalui domain Vercel.

---

## 🔒 Keamanan dan Validasi

PreOrderKu menerapkan beberapa mekanisme untuk menjaga keamanan dan integritas data:

- Row Level Security (RLS) untuk membatasi akses data berdasarkan pemilik pre-order.
- Validasi batas waktu pemesanan dilakukan di sisi server.
- Validasi sisa stok dilakukan melalui fungsi RPC `place_order`.
- Pembeli dapat melakukan pemesanan tanpa harus memiliki akun.
- Akses data publik dibatasi melalui fungsi RPC yang telah disediakan.

---

## 📊 Rekomendasi Produksi

PreOrderKu menyediakan fitur rekomendasi produksi sederhana berdasarkan riwayat pesanan.

Perhitungan menggunakan rata-rata jumlah pesanan dari tiga periode pre-order terakhir untuk produk dengan nama yang sama, kemudian ditambahkan cadangan sebesar 10%.

**Rumus:**

```text
Rekomendasi Produksi =
CEILING(Rata-rata 3 PO Terakhir × 1.10)
```

Jika belum terdapat riwayat pesanan, sistem akan menampilkan informasi bahwa data belum tersedia.

---

## 📌 Informasi Proyek

| Keterangan | Detail |
|---|---|
| Nama Proyek | PreOrderKu |
| Kategori | Web Application |
| Platform | Web |
| Target Pengguna | Mahasiswa penjual makanan kampus |
| Sistem Pemesanan | Pre-Order H-1 |
| Database | PostgreSQL (Supabase) |
| Hosting | Vercel |

---

**PreOrderKu — Pesan Lebih Awal, Produksi Lebih Terencana.**
