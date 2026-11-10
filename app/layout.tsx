import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: [
    { path: "../public/fonts/fraunces-normal.woff2", weight: "400 800", style: "normal" },
    { path: "../public/fonts/fraunces-italic.woff2", weight: "400 800", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const sans = localFont({
  src: [
    { path: "../public/fonts/karla-normal.woff2", weight: "400 700", style: "normal" },
    { path: "../public/fonts/karla-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "PreOrderKu — pre-order untuk penjual kampus",
  description:
    "Buka pre-order sehari sebelum produksi. Pembeli pesan lewat satu tautan, kamu masak sesuai angka.",
  applicationName: "PreOrderKu",
  appleWebApp: { capable: true, title: "PreOrderKu", statusBarStyle: "default" },
  // icon.svg / apple-icon.png / favicon.ico di folder app/ dipakai otomatis
  openGraph: {
    title: "PreOrderKu",
    description: "Pre-order sehari sebelum masak. Satu tautan untuk pembeli kampus.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  themeColor: "#F3EEE3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
