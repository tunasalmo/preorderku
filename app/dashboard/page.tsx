"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { sisaWaktu, tanggalPanjang, waktuLengkap } from "@/lib/format";

type Baris = {
  id: string;
  title: string;
  slug: string;
  pickup_date: string;
  deadline: string;
  status: "open" | "closed";
  orders: { count: number }[] | null;
};

function StatusChip({ status, deadline }: { status: "open" | "closed"; deadline: string }) {
  const lewat = new Date(deadline).getTime() <= Date.now();
  if (status === "closed") {
    return <span className="chip border-line text-ink-faint">Ditutup</span>;
  }
  if (lewat) {
    return <span className="chip border-accent/40 text-accent">Lewat batas</span>;
  }
  return (
    <span className="chip border-olive/40 text-olive">
      <span aria-hidden className="inline-block h-[5px] w-[5px] rounded-full bg-olive" />
      Dibuka
    </span>
  );
}

export default function DashboardPage() {
  const [daftar, setDaftar] = useState<Baris[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const { data, error: err } = await supabaseBrowser()
        .from("preorders")
        .select("id, title, slug, pickup_date, deadline, status, orders(count)")
        .order("created_at", { ascending: false });
      if (!aktif) return;
      if (err) {
        setError("Gagal memuat pre-order. Coba muat ulang halaman.");
        setDaftar([]);
        return;
      }
      setDaftar((data ?? []) as unknown as Baris[]);
    })();
    return () => {
      aktif = false;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Dashboard penjual</p>
          <h1 className="mt-2 font-display text-[34px] leading-none tracking-[-0.025em]">
            Pre-order
          </h1>
        </div>
        <Link href="/dashboard/new" className="btn-primary">
          Buat pre-order
        </Link>
      </div>

      {error && (
        <p className="mt-5 border-l-2 border-accent pl-3 text-[13px] text-accent">{error}</p>
      )}

      {daftar === null ? (
        <div className="mt-8 border border-line px-4 py-10 text-center text-[13px] text-ink-faint">
          Memuat…
        </div>
      ) : daftar.length === 0 ? (
        <div className="mt-8 border border-dashed border-line bg-paper-2/60 px-6 py-12 text-center">
          <p className="font-display text-[20px] tracking-[-0.01em]">Belum ada pre-order.</p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
            Buat PO pertama: isi menu dan batas waktu, lalu bagikan tautannya ke grup
            WhatsApp.
          </p>
          <Link href="/dashboard/new" className="btn-primary mt-6">
            Buat pre-order
          </Link>
        </div>
      ) : (
        <div className="mt-8 border border-line">
          <div className="hidden grid-cols-[1fr_150px_160px_96px] gap-4 border-b border-line bg-paper-3/40 px-4 py-2 sm:grid">
            <span className="label">Pre-order</span>
            <span className="label">Ambil</span>
            <span className="label">Batas pesan</span>
            <span className="label text-right">Pesanan</span>
          </div>

          <ul className="divide-y divide-line">
            {daftar.map((po) => (
              <li key={po.id}>
                <Link
                  href={`/dashboard/${po.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-paper-2"
                >
                  <div className="grid gap-1.5 sm:grid-cols-[1fr_150px_160px_96px] sm:items-center sm:gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[17px] leading-snug tracking-[-0.01em]">
                        {po.title}
                      </span>
                      <StatusChip status={po.status} deadline={po.deadline} />
                    </div>
                    <span className="text-[13px] text-ink-soft">{tanggalPanjang(po.pickup_date)}</span>
                    <span className="text-[13px] text-ink-soft">
                      {waktuLengkap(po.deadline)}
                      <span className="num text-ink-faint"> · {sisaWaktu(po.deadline)}</span>
                    </span>
                    <span className="num text-[13px] sm:text-right">
                      {(po.orders?.[0]?.count ?? 0) || 0} pesanan
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
