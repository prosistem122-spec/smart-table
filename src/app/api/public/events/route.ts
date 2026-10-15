import { NextRequest } from "next/server";
import { eventsBatchSchema, sanitizeMetadata } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRateLimitPerMinute, isSupabaseConfigured } from "@/lib/env";
import { tryCreateServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`events:${ip}`, getRateLimitPerMinute() * 2);
  if (!rl.ok) {
    return Response.json({ error: "Rate limit" }, { status: 429 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Base de dados não configurada" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = eventsBatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Eventos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { lead_id, session_id, events } = parsed.data;
  const supabase = tryCreateServiceClient();
  if (!supabase) {
    return Response.json({ error: "Supabase indisponível" }, { status: 503 });
  }

  // Validar associação sessão ↔ lead
  const { data: session } = await supabase
    .from("sessions")
    .select("id, lead_id, consent_analytics")
    .eq("id", session_id)
    .maybeSingle();

  if (!session || session.lead_id !== lead_id) {
    return Response.json({ error: "Sessão inválida" }, { status: 403 });
  }

  const rows = events.map((e) => ({
    lead_id,
    session_id,
    event_name: e.event_name,
    occurred_at: e.occurred_at || new Date().toISOString(),
    page: e.page || null,
    step_id: e.step_id || null,
    step_index: e.step_index ?? null,
    element_name: e.element_name || null,
    action: e.action || null,
    value: e.value || null,
    previous_page: e.previous_page || null,
    next_page: e.next_page || null,
    duration_ms: e.duration_ms ?? null,
    consent_analytics: e.consent_analytics ?? session.consent_analytics,
    metadata: sanitizeMetadata(e.metadata),
    dedupe_key: e.dedupe_key || null,
  }));

  const withDedupe = rows.filter((r) => r.dedupe_key);
  const withoutDedupe = rows.filter((r) => !r.dedupe_key);
  let accepted = 0;

  if (withDedupe.length) {
    const { error, data } = await supabase
      .from("events")
      .upsert(withDedupe, { onConflict: "dedupe_key", ignoreDuplicates: true })
      .select("id");
    if (error && error.code !== "23505") {
      console.error(error);
      return Response.json({ error: "Falha ao guardar eventos" }, { status: 500 });
    }
    accepted += data?.length ?? withDedupe.length;
  }

  if (withoutDedupe.length) {
    const { error, data } = await supabase
      .from("events")
      .insert(withoutDedupe)
      .select("id");
    if (error) {
      console.error(error);
      return Response.json({ error: "Falha ao guardar eventos" }, { status: 500 });
    }
    accepted += data?.length ?? withoutDedupe.length;
  }

  const inserted = { length: accepted };

  const last = events[events.length - 1];
  const now = new Date().toISOString();
  const leadPatch: Record<string, unknown> = {
    last_activity_at: now,
    events_count: undefined,
  };

  if (last.page) leadPatch.last_page = last.page;
  if (last.step_id) leadPatch.last_step = last.step_id;
  if (typeof last.step_index === "number") leadPatch.last_step_index = last.step_index;

  const names = new Set(events.map((e) => e.event_name));
  if (names.has("funnel_completed")) leadPatch.funnel_completed = true;
  if (names.has("whatsapp_click")) leadPatch.whatsapp_clicked = true;
  if (names.has("contact_requested")) leadPatch.contact_requested = true;

  // Incrementar contagem de eventos
  const { data: lead } = await supabase
    .from("leads")
    .select("events_count")
    .eq("id", lead_id)
    .single();

  await supabase
    .from("leads")
    .update({
      ...leadPatch,
      events_count: (lead?.events_count || 0) + events.length,
      updated_at: now,
    })
    .eq("id", lead_id);

  await supabase
    .from("sessions")
    .update({
      last_activity_at: now,
      last_page: last.page || null,
      last_step: last.step_id || null,
      last_step_index: last.step_index ?? null,
      activity_status: names.has("session_inactive") ? "inactive" : "active",
    })
    .eq("id", session_id);

  return Response.json({
    ok: true,
    accepted: inserted.length,
  });
}
