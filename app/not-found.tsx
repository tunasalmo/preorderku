import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <Wordmark />
      <h1 className="mt-8 font-display text-[32px] leading-tight tracking-[-0.02em]">
        Halaman tidak ada.
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
        Tautan yang kamu buka mungkin sudah berubah atau salah ketik.
      </p>
      <Link href="/" className="btn-ghost mt-6 self-start">
        Ke halaman utama
      </Link>
    </main>
  );
}
