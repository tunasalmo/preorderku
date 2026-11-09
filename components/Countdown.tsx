"use client";

import { useEffect, useState } from "react";

export default function Countdown({ deadline }: { deadline: string }) {
  const [sisa, setSisa] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSisa(new Date(deadline).getTime() - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (sisa === null) {
    return <span className="num text-ink-faint">menghitung…</span>;
  }

  if (sisa <= 0) {
    return <span className="font-semibold text-accent">Ditutup</span>;
  }

  const total = Math.floor(sisa / 1000);
  const hari = Math.floor(total / 86400);
  const jam = Math.floor((total % 86400) / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const detik = total % 60;
  const dua = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="num tabular-nums">
      {hari > 0 && <>{hari} hari </>}
      {dua(jam)}:{dua(menit)}:{dua(detik)}
    </span>
  );
}
