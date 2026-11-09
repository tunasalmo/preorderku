"use client";

import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [label, setLabel] = useState("Salin tautan");

  async function salin() {
    try {
      await navigator.clipboard.writeText(url);
      setLabel("Tersalin");
    } catch {
      setLabel(url);
    }
    setTimeout(() => setLabel("Salin tautan"), 2200);
  }

  return (
    <button type="button" onClick={salin} className="btn-ghost px-3 py-1.5 text-[13px]">
      {label}
    </button>
  );
}
