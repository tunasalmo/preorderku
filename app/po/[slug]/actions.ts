"use server";

import { supabaseServer } from "@/lib/supabase";

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
