"use client";

import Link from "next/link";
import { useState } from "react";
import Wordmark from "@/components/Wordmark";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      const supabase = supabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (err) throw err;
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      const pesan = err instanceof Error ? err.message : "Gagal mengirim tautan.";
      setError(
        /rate limit/i.test(pesan)
          ? "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi."
          : /configured/i.test(pesan)
            ? "Supabase belum dikonfigurasi. Isi .env.local lalu jalankan ulang server."
            : pesan,
      );
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_460px]">
      <section className="hidden flex-col justify-between border-r border-line px-10 py-10 md:flex">
        <Wordmark />

        <div className="max-w-sm">
          <p className="label">Masuk penjual</p>
          <h1 className="mt-4 font-display text-[40px] leading-[1.02] tracking-[-0.025em]">
            Satu tautan,
            <br />
            tanpa kata sandi.
          </h1>
          <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
            Masukkan email yang biasa kamu pakai. Kami kirim tautan sekali pakai untuk
            membuka dashboard pre-order.
          </p>
        </div>

        <p className="max-w-xs text-[12px] leading-relaxed text-ink-faint">
          Pembeli tidak perlu akun. Mereka cukup membuka tautan pre-order yang kamu bagikan.
        </p>
      </section>

      <main className="flex flex-col justify-center bg-paper-2 px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="md:hidden">
            <Wordmark />
          </div>

          <div className="mt-8 md:mt-0">
            <h2 className="font-display text-[26px] tracking-[-0.015em] md:hidden">
              Masuk penjual
            </h2>

            {status === "sent" ? (
              <div className="border border-line bg-paper px-5 py-6">
                <p className="label">Tautan terkirim</p>
                <p className="mt-3 text-[15px] leading-relaxed">
                  Cek kotak masuk <span className="font-semibold">{email}</span>. Buka
                  tautannya di browser yang sama untuk menyelesaikan masuk.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  Tidak ada email? Periksa folder spam, atau kirim ulang di bawah.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="btn-quiet mt-4 px-0"
                >
                  Kirim ulang tautan
                </button>
              </div>
            ) : (
              <form onSubmit={kirim} className="space-y-2">
                <label htmlFor="email" className="label block">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@kampus.ac.id"
                  className="field"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="btn-primary mt-2 w-full"
                >
                  {status === "sending" ? "Mengirim…" : "Kirim tautan masuk"}
                </button>
              </form>
            )}

            {error && (
              <p className="mt-3 border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-accent">
                {error}
              </p>
            )}

            {!isSupabaseConfigured && (
              <p className="mt-4 border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-accent">
                Supabase belum dikonfigurasi. Salin <code>.env.local.example</code> menjadi{" "}
                <code>.env.local</code> dan isi URL serta anon key proyek kamu.
              </p>
            )}

            <div className="mt-8 border-t border-line pt-4">
              <Link
                href="/"
                className="text-[13px] text-ink-soft underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                Kembali ke halaman utama
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
