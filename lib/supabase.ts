import { createClient } from "@supabase/supabase-js";
import { getApiBaseUrl } from "@/constants/oauth";
import { getSessionToken } from "@/lib/_core/auth";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || "https://invalid.supabase.co", anonKey || "invalid", {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function authorizeSupabaseChat() {
  if (!supabaseConfigured) throw new Error("Supabase chat is not configured");
  const baseUrl = getApiBaseUrl();
  const sessionToken = await getSessionToken();
  if (!baseUrl || !sessionToken) throw new Error("A valid server session is required for chat");
  const response = await fetch(`${baseUrl}/api/auth/chat-token`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) throw new Error("A valid server session is required for chat");
  const { accessToken: token } = (await response.json()) as { accessToken: string };
  await supabase.auth.setSession({ access_token: token, refresh_token: "" });
  await supabase.realtime.setAuth(token);
}