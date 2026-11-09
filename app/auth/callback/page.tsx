"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let selesai = false;

    const keDashboard = () => {
      if (selesai) return;
      selesai = true;
      router.replace("/dashboard");
    };

    const { data: langganan } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) keDashboard();
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return keDashboard();

      const url = new URL(window.location.href);
      const errorDesc = url.searchParams.get("error_description");
      if (errorDesc) {
        setPesan("Tautan tidak berlaku lagi. Minta tautan baru dari halaman masuk.");
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        setPesan(
          "Tautan masuk tidak lengkap. Pastikan kamu membuka tautan dari email terbaru di browser yang sama.",
        );
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return keDashboard();
      setPesan("Tautan sudah dipakai atau kedaluwarsa. Minta tautan baru dari halaman masuk.");
    })();

    return () => langganan.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <p className="label">Memeriksa tautan</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        {pesan ?? "Sebentar, kami sedang membuka sesi kamu…"}
      </p>
      {pesan && (
        <Link href="/login" className="btn-primary mt-6 self-start">
          Minta tautan baru
        </Link>
      )}
    </main>
  );
}
