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

  // O ID da sessão é também a chave idempotente da primeira submissão de contacto.
  async function existingSubmission() {
    if (!data.submission_id) return null;
    const { data: session, error } = await supabase!.from("sessions").select("id, lead_id, leads(phone_normalized)").eq("id", data.submission_id).maybeSingle();
    if (error) throw error;
    if (!session) return null;
    const lead = Array.isArray(session.leads) ? session.leads[0] : session.leads;
    if (!lead || lead.phone_normalized !== phone.e164) return { conflict: true as const };
    return { conflict: false as const, lead_id: session.lead_id, session_id: session.id, resumed: true, already_started: true, phone_normalized: phone.e164 };
  }
  try {
    const prior = await existingSubmission();
    if (prior?.conflict) return Response.json({ error: "Identificador de submissão já utilizado" }, { status: 409 });
    if (prior) return Response.json(prior);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Falha ao verificar sessão" }, { status: 500 });
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
      // Pedidos simultâneos para o mesmo telefone podem disputar a criação do lead.
      if (error?.code === "23505") {
        const retry = await supabase.from("leads").select("id").eq("phone_normalized", phone.e164).maybeSingle();
        if (!retry.data) return Response.json({ error: "Falha ao criar contacto" }, { status: 500 });
        leadId = retry.data.id;
        resumed = true;
      } else {
        console.error(error);
        return Response.json({ error: "Falha ao criar contacto" }, { status: 500 });
      }
    } else leadId = created.id;
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      ...(data.submission_id ? { id: data.submission_id } : {}),
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
      last_page: "funnel",
      last_step: "contact_partial",
      last_step_index: 5,
      activity_status: "active",
    })
    .select("id")
    .single();

  if (sErr || !session) {
    if (sErr?.code === "23505" && data.submission_id) {
      try {
        const prior = await existingSubmission();
        if (prior?.conflict) return Response.json({ error: "Identificador de submissão já utilizado" }, { status: 409 });
        if (prior) return Response.json(prior);
      } catch (error) { console.error(error); }
    }
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
