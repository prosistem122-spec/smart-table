import { NextRequest } from "next/server";
import { answersSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRateLimitPerMinute, isSupabaseConfigured } from "@/lib/env";
import { tryCreateServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`answers:${ip}`, getRateLimitPerMinute());
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

  const parsed = answersSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Respostas inválidas" }, { status: 400 });
  }

  const { lead_id, session_id, answers } = parsed.data;
  const supabase = tryCreateServiceClient();
  if (!supabase) {
    return Response.json({ error: "Supabase indisponível" }, { status: 503 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, lead_id")
    .eq("id", session_id)
    .maybeSingle();

  if (!session || session.lead_id !== lead_id) {
    return Response.json({ error: "Sessão inválida" }, { status: 403 });
  }

  const rows = answers.map((a) => ({
    lead_id,
    session_id,
    question_key: a.question_key,
    answer: a.answer,
    step_id: a.step_id || null,
  }));

  const { error } = await supabase
    .from("funnel_answers")
    .upsert(rows, { onConflict: "session_id,question_key" });

  if (error) {
    console.error(error);
    return Response.json({ error: "Falha ao guardar respostas" }, { status: 500 });
  }

  await supabase
    .from("leads")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", lead_id);

  return Response.json({ ok: true });
}
