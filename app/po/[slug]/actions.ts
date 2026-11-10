"use server";

import { supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { createSnapTransaction, midtransEnabled } from "@/lib/midtrans";

export type HasilPesan =
  | { ok: true; orderId: string }
  | { ok: false; message: string };

export async function placeOrder(
  slug: string,
  input: { name: string; phone: string; items: { product_id: string; qty: number }[] },
): Promise<HasilPesan> {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("place_order", {
      p_slug: slug,
      p_buyer_name: input.name,
      p_buyer_phone: input.phone,
      p_items: input.items,
    });

    if (error) {
      return { ok: false, message: error.message.replace(/^.*?:\s*/, "").trim() || "Pesanan gagal dikirim." };
    }
    return { ok: true, orderId: String(data) };
  } catch (err) {
    console.error("place_order", err);
    return { ok: false, message: "Pesanan gagal dikirim. Coba lagi sebentar." };
  }
}

export type HasilBayar =
  | { ok: true; token: string; redirectUrl: string }
  | { ok: false; message: string };

/**
 * Buat token pembayaran Snap untuk satu pesanan.
 * Dipanggil dari halaman pembeli; total dihitung ulang di server
 * dari order_items × harga produk (bukan dari input client).
 */
export async function createPayment(orderId: string): Promise<HasilBayar> {
  if (!midtransEnabled) {
    return { ok: false, message: "Pembayaran otomatis belum aktif di server." };
  }
  try {
    const supabase = supabaseAdmin();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, buyer_name, buyer_phone, payment_status, order_items(qty, products(price))")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) return { ok: false, message: "Pesanan tidak ditemukan." };
    if (order.payment_status === "paid") {
      return { ok: false, message: "Pesanan ini sudah lunas." };
    }

    type Item = { qty: number; products: { price: number }[] | null };
    const items = (order.order_items ?? []) as Item[];
    if (items.length === 0) return { ok: false, message: "Pesanan kosong." };

    const gross = items.reduce((sum, it) => sum + it.qty * (it.products?.[0]?.price ?? 0), 0);
    if (gross <= 0) return { ok: false, message: "Jumlah pembayaran tidak valid." };

    const midtransOrderId = `POK-${orderId.replace(/-/g, "").slice(0, 12)}-${Date.now().toString(36)}`;

    const snap = await createSnapTransaction({
      order_id: midtransOrderId,
      gross_amount: gross,
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
    });

    const { error: errUpdate } = await supabase
      .from("orders")
      .update({
        payment_status: "pending",
        snap_token: snap.token,
        midtrans_order_id: midtransOrderId,
        gross_amount: gross,
        payment_method: null,
      })
      .eq("id", orderId);

    if (errUpdate) {
      return { ok: false, message: `Gagal menyimpan pembayaran: ${errUpdate.message}` };
    }

    return { ok: true, token: snap.token, redirectUrl: snap.redirect_url };
  } catch (err) {
    console.error("createPayment", err);
    return {
      ok: false,
      message:
        err instanceof Error
          ? /Midtrans/.test(err.message)
            ? "Pembayaran tidak tersedia saat ini. Coba lagi atau bayar manual ke penjual."
            : err.message
          : "Gagal menyiapkan pembayaran.",
    };
  }
}

export async function paymentStatus(orderId: string): Promise<{
  status: "unpaid" | "pending" | "paid" | "failed" | "unknown";
  paid: boolean;
}> {
  try {
    const { data } = await supabaseAdmin()
      .from("orders")
      .select("payment_status, paid")
      .eq("id", orderId)
      .maybeSingle();
    if (!data) return { status: "unknown", paid: false };
    return { status: data.payment_status, paid: data.paid };
  } catch {
    return { status: "unknown", paid: false };
  }
}
