import { createHash } from "crypto";

/** Helper Midtrans Snap — hanya untuk dipakai di sisi server. */

const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const midtransServerKey = process.env.MIDTRANS_SERVER_KEY ?? "";
export const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

/** true bila key terisi — UI pembeli menampilkan tombol bayar otomatis. */
export const midtransEnabled = Boolean(midtransServerKey && midtransClientKey);

export const midtransBase = isProd
  ? "https://app.midtrans.com"
  : "https://app.sandbox.midtrans.com";

export const snapJsUrl = `${midtransBase}/snap/snap.js?client_key=${encodeURIComponent(midtransClientKey)}`;

type SnapResponse = {
  token: string;
  redirect_url: string;
  error_message?: string;
  status_message?: string;
};

/** Buat transaksi Snap (QRIS / GoPay / dll sesuai setting merchant). */
export async function createSnapTransaction(params: {
  order_id: string;
  gross_amount: number;
  buyer_name: string;
  buyer_phone: string;
}): Promise<SnapResponse> {
  const res = await fetch(`${midtransBase}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Basic " + Buffer.from(midtransServerKey + ":").toString("base64"),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.order_id,
        gross_amount: params.gross_amount,
      },
      customer_details: {
        first_name: params.buyer_name.slice(0, 50),
        phone: params.buyer_phone,
      },
      expiry: { duration: 30, unit: "minutes" },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as SnapResponse;
  if (!res.ok || !data.token) {
    throw new Error(data.error_message || data.status_message || `Midtrans HTTP ${res.status}`);
  }
  return data;
}

/**
 * Cek status transaksi langsung ke Midtrans (bukan webhook).
 * Dipakai polling halaman pembeli: membuat status "Lunas" tetap ter-update
 * walau webhook belum/tidak bisa menjangkau server (mis. localhost).
 * Mengembalikan null bila transaksi belum ada di Midtrans.
 */
export async function cekStatusMidtrans(
  midtransOrderId: string,
): Promise<{ transaction_status: string; payment_type?: string; fraud_status?: string } | null> {
  const res = await fetch(`${midtransBase}/v2/${encodeURIComponent(midtransOrderId)}/status`, {
    headers: {
      Accept: "application/json",
      Authorization: "Basic " + Buffer.from(midtransServerKey + ":").toString("base64"),
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as
    | { transaction_status?: string; payment_type?: string; fraud_status?: string }
    | null;
  if (!data?.transaction_status) return null;
  return {
    transaction_status: data.transaction_status,
    payment_type: data.payment_type,
    fraud_status: data.fraud_status,
  };
}

/** Verifikasi notifikasi webhook: sha512(order_id + status_code + gross_amount + server_key). */
export function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const digest = createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${midtransServerKey}`)
    .digest("hex");
  return digest === payload.signature_key;
}
