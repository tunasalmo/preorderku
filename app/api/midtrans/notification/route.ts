import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMidtransSignature } from "@/lib/midtrans";

export const runtime = "nodejs";

/**
 * Webhook notifikasi Midtrans → update status pembayaran pesanan.
 * URL ini didaftarkan di dashboard Midtrans → Settings → Payment Notification URL:
 *   sandbox: https://app.sandbox.midtrans.com (dashboard) — URL: <origin>/api/midtrans/notification
 * Verifikasi: sha512(order_id + status_code + gross_amount + server_key).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ status_code: 400 }, { status: 400 });
  }

  const {
    order_id,
    status_code,
    gross_amount,
    transaction_status,
    payment_type,
    signature_key,
  } = body as Record<string, string>;

  if (!order_id || !status_code || !gross_amount || !transaction_status) {
    return NextResponse.json({ status_code: 400 }, { status: 400 });
  }

  if (!verifyMidtransSignature({ order_id, status_code, gross_amount, signature_key })) {
    console.error("midtrans webhook: signature tidak cocok", order_id);
    return NextResponse.json({ status_code: 403 }, { status: 403 });
  }

  try {
    const supabase = supabaseAdmin();
    const { data: order } = await supabase
      .from("orders")
      .select("id, gross_amount, payment_status")
      .eq("midtrans_order_id", order_id)
      .maybeSingle();

    if (!order) {
      console.warn("midtrans webhook: order tidak ditemukan", order_id);
      return NextResponse.json({ status_code: 200 });
    }

    if (String(gross_amount) !== String(order.gross_amount)) {
      console.error("midtrans webhook: jumlah tidak cocok", order_id, gross_amount, order.gross_amount);
      return NextResponse.json({ status_code: 400 }, { status: 400 });
    }

    let update: Record<string, unknown> = {};
    if (transaction_status === "capture" || transaction_status === "settlement") {
      update = {
        paid: true,
        payment_status: "paid",
        payment_method: payment_type ?? null,
        paid_at: new Date().toISOString(),
      };
    } else if (transaction_status === "pending") {
      update = { payment_status: "pending", payment_method: payment_type ?? null };
    } else if (["deny", "cancel", "expire", "failure"].includes(transaction_status)) {
      update = { payment_status: "failed", paid: false };
    } else {
      return NextResponse.json({ status_code: 200 });
    }

    const { error } = await supabase.from("orders").update(update).eq("id", order.id);
    if (error) {
      console.error("midtrans webhook: gagal update", error.message);
      return NextResponse.json({ status_code: 500 }, { status: 500 });
    }
  } catch (err) {
    console.error("midtrans webhook:", err);
    return NextResponse.json({ status_code: 500 }, { status: 500 });
  }

  return NextResponse.json({ status_code: 200 });
}
