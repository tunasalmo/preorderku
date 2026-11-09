const bulan = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function rupiah(value: number): string {
  return "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(value || 0));
}

/** '2026-11-12' -> Date lokal (hindari pergeseran zona waktu). */
export function dateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function tanggalPanjang(value: string): string {
  const d = value.length <= 10 ? dateOnly(value) : new Date(value);
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function tanggalPendek(value: string): string {
  const d = value.length <= 10 ? dateOnly(value) : new Date(value);
  return `${d.getDate()} ${bulan[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function jam(value: string): string {
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

export function waktuLengkap(value: string): string {
  return `${tanggalPendek(value)}, ${jam(value)}`;
}

/** "2 hari lagi", "3 jam lagi", "sudah lewat" */
export function sisaWaktu(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "sudah lewat";
  const menit = Math.floor(ms / 60000);
  const hari = Math.floor(menit / 1440);
  const jamSisa = Math.floor((menit % 1440) / 60);
  if (hari >= 1) return `${hari} hari lagi`;
  if (jamSisa >= 1) return `${jamSisa} jam lagi`;
  return `${Math.max(menit, 1)} menit lagi`;
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-|-$/g, "");
  return base || "po";
}

export function waLink(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  return `https://wa.me/${normalized}`;
}
