"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Wordmark from "@/components/Wordmark";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);
  const konfigurasi = isSupabaseConfigured;

  useEffect(() => {
    if (!konfigurasi) {
      setSiap(true);
      return;
    }
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setSiap(true);
    });
    const { data: langganan } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setSiap(true);
    });
    return () => langganan.subscription.unsubscribe();
  }, [konfigurasi]);

  useEffect(() => {
    if (konfigurasi && siap && !email) router.replace("/login");
  }, [konfigurasi, siap, email, router]);

  async function keluar() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <Wordmark href="/dashboard" />

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/new"
              className="text-[13px] font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              Buat PO
            </Link>
            <span className="hidden text-[12px] text-ink-faint sm:inline">{email ?? ""}</span>
            {konfigurasi && (
              <button
                type="button"
                onClick={keluar}
                className="text-[13px] text-ink-soft underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                Keluar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:py-10">
        {!konfigurasi ? (
          <div className="border border-dashed border-line bg-paper-2 px-6 py-10">
            <p className="font-display text-[20px] tracking-[-0.01em]">
              Supabase belum dikonfigurasi.
            </p>
            <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-soft">
              Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code>, lalu
              jalankan ulang server.
            </p>
          </div>
        ) : email ? (
          children
        ) : (
          <p className="text-[14px] text-ink-faint">
            {siap ? "Mengalihkan ke halaman masuk…" : "Memuat sesi…"}
          </p>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-4 text-[11px] uppercase tracking-label text-ink-faint">
          PreOrderKu · pre-order penjual kampus
        </div>
      </footer>
    </div>
  );
}
