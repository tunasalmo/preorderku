import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

let browserClient: SupabaseClient | null = null;

/** Klien untuk komponen client. Sesi disimpan di browser, token dipakai RLS. */
export function supabaseBrowser(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.",
    );
  }
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return browserClient;
}

/** Klien tanpa sesi untuk server (RPC publik, server action). */
export function supabaseServer(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase belum dikonfigurasi pada environment server.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
