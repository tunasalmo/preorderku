import Link from "next/link";
import Countdown from "@/components/Countdown";
import OrderForm from "@/components/OrderForm";
import { midtransEnabled, snapJsUrl } from "@/lib/midtrans";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { tanggalPanjang, waktuLengkap } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

type PoPublik = {
  id: string;
  slug: string;
  title: string;
  pickup_date: string;
  pickup_location: string;
  deadline: string;
  status: "open" | "closed";
  products: PublicProduct[];
};

function Kerangka({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-20 pt-6 sm:px-6">
      {children}
      <p className="mt-10 border-t border-line pt-4 text-[11px] uppercase tracking-label text-ink-faint">
        Dipesan lewat PreOrderKu
      </p>
    </main>
  );
}

export default async function PreorderPublikPage({ params }: { params: { slug: string } }) {
  if (!isSupabaseConfigured) {
    return (
      <Kerangka>
        <p className="label">Pre-order</p>
        <p className="mt-4 text-[15px] leading-relaxed">
          Halaman ini belum bisa dibuka karena Supabase belum dikonfigurasi di server.
        </p>
      </Kerangka>
    );
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("get_public_preorder", { p_slug: params.slug });

  if (error) {
    console.error("get_public_preorder", error.message);
  }

  const po = (data ?? null) as PoPublik | null;

  if (!po) {
    return (
      <Kerangka>
        <p className="label">Pre-order</p>
        <h1 className="mt-3 font-display text-[28px] leading-tight tracking-[-0.02em]">
          Tautan tidak dikenali.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          Pastikan tautan yang kamu buka sama dengan yang dikirim penjual. Bila sudah
          kedaluwarsa, minta tautan baru.
        </p>
      </Kerangka>
    );
  }

  const lewat = new Date(po.deadline).getTime() <= Date.now();
  const terbuka = po.status === "open" && !lewat;
  const catatanTutup = po.status === "closed"
    ? "Pre-order ini sudah ditutup oleh penjual. Hubungi penjual bila ingin memesan di luar pre-order."
    : "Batas waktu pemesanan sudah lewat. Hubungi penjual untuk menanyakan sisa porsi.";

  return (
    <Kerangka>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <span className="label">Pre-order</span>
        <span
          className={
            "text-[11px] font-semibold uppercase tracking-label " +
            (terbuka ? "text-olive" : "text-ink-faint")
          }
        >
          {terbuka ? "Dibuka" : "Ditutup"}
        </span>
      </div>

      <h1 className="mt-5 font-display text-[32px] leading-[1.04] tracking-[-0.025em] sm:text-[38px]">
        {po.title}
      </h1>

      <dl className="mt-5 space-y-2 text-[13.5px]">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-faint">Ambil</dt>
          <dd className="text-right">{tanggalPanjang(po.pickup_date)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-faint">Lokasi</dt>
          <dd className="max-w-[70%] text-right">{po.pickup_location}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-faint">Batas pesan</dt>
          <dd className="num text-right">{waktuLengkap(po.deadline)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between border-y border-line py-3">
        <div>
          <p className="label">Sisa waktu</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            {terbuka ? "Pesanan ditutup otomatis" : "Form pemesanan nonaktif"}
          </p>
        </div>
        <p className="font-display text-[19px] tracking-[-0.01em]">
          <Countdown deadline={po.deadline} />
        </p>
      </div>

      <OrderForm
        slug={po.slug}
        products={po.products ?? []}
        terbuka={terbuka}
        catatanTutup={catatanTutup}
        paymentTersedia={midtransEnabled}
        snapJsUrl={midtransEnabled ? snapJsUrl : null}
      />

      <p className="mt-8 text-[12px] leading-relaxed text-ink-faint">
        Pembayaran dilakukan langsung ke penjual (transfer atau COD saat ambil).{" "}
        <Link href="/" className="underline decoration-line underline-offset-4 hover:text-ink">
          Apa ini?
        </Link>
      </p>
    </Kerangka>
  );
}
