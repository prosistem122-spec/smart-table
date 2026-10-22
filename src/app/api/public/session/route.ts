import { NextRequest } from "next/server";
import { sessionStartSchema } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRateLimitPerMinute, isSupabaseConfigured } from "@/lib/env";
import { tryCreateServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`session:${ip}`, getRateLimitPerMinute());
  if (!rl.ok) {
    return Response.json({ error: "Demasiados pedidos. Tente novamente em breve." }, { status: 429 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json(
      {
        error:
          "Base de dados não configurada. Defina as variáveis Supabase no ficheiro .env.local.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = sessionStartSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!data.consent_contact && !data.consent_analytics) {
    return Response.json(
      { error: "É necessário consentir o tratamento dos dados para continuar." },
      { status: 400 }
    );
  }

  const phone = normalizePhone(data.phone);
  if (!phone.ok || !phone.e164) {
    return Response.json({ error: phone.error || "Telefone inválido" }, { status: 400 });
  }

  const supabase = tryCreateServiceClient();
  if (!supabase) {
    return Response.json({ error: "Supabase indisponível" }, { status: 503 });
  }

  const retentionDays = Number(process.env.EVENT_RETENTION_DAYS) || 365;
  const retentionUntil = new Date(
    Date.now() + retentionDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const attr = data.attribution || {};

  // Match fiável: telefone normalizado exacto
  const { data: existing } = await supabase
    .from("leads")
    .select("*")
    .eq("phone_normalized", phone.e164)
    .maybeSingle();

  let leadId: string;
  let resumed = false;

  if (existing) {
    leadId = existing.id;
    resumed = true;
    await supabase
      .from("leads")
      .update({
        restaurant_name: data.restaurant_name.trim(),
        phone_raw: data.phone.trim(),
        consent_analytics: data.consent_analytics || existing.consent_analytics,
        consent_contact: data.consent_contact || existing.consent_contact,
        last_activity_at: new Date().toISOString(),
        retention_until: retentionUntil,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);
  } else {
    const { data: created, error } = await supabase
      .from("leads")
      .insert({
        restaurant_name: data.restaurant_name.trim(),
        phone_raw: data.phone.trim(),
        phone_normalized: phone.e164,
        consent_analytics: data.consent_analytics,
        consent_contact: data.consent_contact,
        source: attr.source || attr.utm_source || null,
        utm_source: attr.utm_source || null,
        utm_medium: attr.utm_medium || null,
        utm_campaign: attr.utm_campaign || null,
        utm_content: attr.utm_content || null,
        utm_term: attr.utm_term || null,
        referrer: attr.referrer || null,
        retention_until: retentionUntil,
        sessions_count: 0,
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error(error);
      return Response.json({ error: "Falha ao criar contacto" }, { status: 500 });
    }
    leadId = created.id;
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      lead_id: leadId,
      source: attr.source || attr.utm_source || null,
      utm_source: attr.utm_source || null,
      utm_medium: attr.utm_medium || null,
      utm_campaign: attr.utm_campaign || null,
      utm_content: attr.utm_content || null,
      utm_term: attr.utm_term || null,
      referrer: attr.referrer || null,
      user_agent: data.user_agent || null,
      consent_analytics: data.consent_analytics,
      resumed_from_session_id: resumed ? data.resume_session_id || null : null,
      visit_id: data.visit_id || null,
      last_page: "lead_form",
      last_step: "lead_identification",
      last_step_index: -1,
      activity_status: "active",
    })
    .select("id")
    .single();

  if (sErr || !session) {
    console.error(sErr);
    return Response.json({ error: "Falha ao criar sessão" }, { status: 500 });
  }

  await supabase
    .from("leads")
    .update({
      sessions_count: (existing?.sessions_count || 0) + 1,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  return Response.json({
    lead_id: leadId,
    session_id: session.id,
    resumed,
    phone_normalized: phone.e164,
  });
}
