export function getInactiveAfterMs(): number {
  const n = Number(process.env.INACTIVE_AFTER_MS);
  return Number.isFinite(n) && n > 0 ? n : 15 * 60 * 1000;
}

export function getRateLimitPerMinute(): number {
  const n = Number(process.env.PUBLIC_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export function getWhatsAppNumber(): string {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "258840000000";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getPublicSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}
