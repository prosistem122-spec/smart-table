import { NextRequest } from "next/server";
import { journeySchema } from "@/lib/tracking/journey-validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRateLimitPerMinute } from "@/lib/env";
import { tryCreateServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";



export async function POST(req: NextRequest) {
  if (!rateLimit(`journey:${clientIp(req)}`, getRateLimitPerMinute() * 4).ok) return Response.json({ error: "Demasiados pedidos" }, { status: 429 });
  const parsed = journeySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const db = tryCreateServiceClient();
  if (!db) return Response.json({ error: "Base de dados indisponível" }, { status: 503 });
  const item = parsed.data;
  const now = new Date().toISOString();
  let error;
  if (item.type === "milestone") {
    ({ error } = await db.from("tracking_milestones").upsert({ visit_id: item.visit_id, [item.milestone]: now }, { onConflict: "visit_id" }));
  } else if (item.type === "answer") {
    ({ error } = await db.from("tracking_answers").upsert({ visit_id: item.visit_id, question_key: item.question_key, step_id: item.step_id, answer: item.answer, updated_at: now }, { onConflict: "visit_id,question_key" }));
  } else if (item.type === "step_seen") {
    ({ error } = await db.from("tracking_steps").upsert({ visit_id: item.visit_id, step_id: item.step_id, duration_ms: 0, duration_recorded: false, updated_at: now }, { onConflict: "visit_id,step_id", ignoreDuplicates: true }));
  } else {
    ({ error } = await db.from("tracking_steps").upsert({ visit_id: item.visit_id, step_id: item.step_id, duration_ms: item.duration_ms, duration_recorded: true, updated_at: now }, { onConflict: "visit_id,step_id" }));
  }
  if (error) { console.error(error); return Response.json({ error: "Falha ao registar" }, { status: 500 }); }
  return Response.json({ ok: true });
}
