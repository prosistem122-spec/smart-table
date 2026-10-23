import { NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRateLimitPerMinute, isSupabaseConfigured } from "@/lib/env";
import { tryCreateServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const visitSchema = z.object({
  visit_id: z.string().trim().min(8).max(80),
  page: z.enum(["landing", "video"]),
  attribution: z
    .object({
      source: z.string().max(120).optional().nullable(),
      utm_source: z.string().max(120).optional().nullable(),
      utm_medium: z.string().max(120).optional().nullable(),
      utm_campaign: z.string().max(120).optional().nullable(),
      utm_content: z.string().max(120).optional().nullable(),
      utm_term: z.string().max(120).optional().nullable(),
      referrer: z.string().max(500).optional().nullable(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`visit:${ip}`, getRateLimitPerMinute());
  if (!rl.ok) {
    return Response.json({ error: "Demasiados pedidos." }, { status: 429 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ ok: true, skipped: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = visitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const supabase = tryCreateServiceClient();
  if (!supabase) {
    return Response.json({ ok: true, skipped: true });
  }

  const { visit_id, page, attribution } = parsed.data;
  const now = new Date().toISOString();
  const attr = attribution || {};

  const { data: existing } = await supabase
    .from("page_visits")
    .select("visit_id, landing_seen_at, video_seen_at")
    .eq("visit_id", visit_id)
    .maybeSingle();

  const row: Record<string, unknown> = {
    visit_id,
    last_seen_at: now,
    landing_seen_at:
      page === "landing"
        ? existing?.landing_seen_at || now
        : existing?.landing_seen_at ?? null,
    video_seen_at:
      page === "video"
        ? existing?.video_seen_at || now
        : existing?.video_seen_at ?? null,
    source: attr.source || attr.utm_source || null,
    utm_source: attr.utm_source || null,
    utm_medium: attr.utm_medium || null,
    utm_campaign: attr.utm_campaign || null,
    utm_content: attr.utm_content || null,
    utm_term: attr.utm_term || null,
    referrer: attr.referrer || null,
  };

  if (!existing) {
    row.first_seen_at = now;
  }

  const { error } = await supabase.from("page_visits").upsert(row, {
    onConflict: "visit_id",
  });

  if (error) {
    console.error(error);
    return Response.json({ error: "Falha ao registar visita" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
