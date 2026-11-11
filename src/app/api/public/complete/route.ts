import { NextRequest } from "next/server";
import { z } from "zod";
import { answersSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRateLimitPerMinute } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { tryCreateServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const schema = answersSchema.extend({ submission_id: z.string().uuid() });
export async function POST(req: NextRequest) {
  if (!rateLimit(`complete:${clientIp(req)}`, getRateLimitPerMinute()).ok) return Response.json({ error: "Demasiados pedidos. Tente novamente." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const fields = new Map(parsed.data.answers.map((a) => [a.question_key, a.answer.trim()]));
  if (fields.size !== parsed.data.answers.length || !["nome", "resp_nome", "whatsapp", "cargo", "telefone", "email"].every((key) => fields.get(key)) ||
      !normalizePhone(fields.get("whatsapp") || "").ok || !normalizePhone(fields.get("telefone") || "").ok ||
      !z.string().email().safeParse(fields.get("email")).success) {
    return Response.json({ error: "Verifica os dados de contacto." }, { status: 400 });
  }
  const db = tryCreateServiceClient();
  if (!db) return Response.json({ error: "Base de dados indisponível" }, { status: 503 });
  const { submission_id, lead_id, session_id, answers } = parsed.data;
  const { data, error } = await db.rpc("complete_funnel_submission", { p_submission_id: submission_id, p_lead_id: lead_id, p_session_id: session_id, p_answers: answers });
  if (error) {
    console.error(error);
    const conflict = error.code === "22023" || error.code === "23505";
    return Response.json({ error: error.code === "23505" ? "Esta submissão já foi guardada com outros dados. Repõe os dados originais ou contacta a equipa." : error.code === "22023" ? "Sessão ou submissão inválida" : "Não foi possível guardar os dados. Tenta novamente." }, { status: conflict ? 409 : 500 });
  }
  if (typeof data !== "boolean") return Response.json({ error: "Não foi possível confirmar os dados. Tenta novamente." }, { status: 500 });
  return Response.json({ ok: true, already_completed: !data });
}
