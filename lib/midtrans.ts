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

export const snapJsUrl = `${midtransBase}/snap/v1/snap.js?client_key=${encodeURIComponent(
  midtransClientKey,
)}`;

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
