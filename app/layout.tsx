import type { Metadata } from "next";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
