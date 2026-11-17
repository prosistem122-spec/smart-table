import { NextRequest } from "next/server";
import { completeSubmissionSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRateLimitPerMinute } from "@/lib/env";
import { tryCreateServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isMissingRpcError(error: { code?: string; message?: string }): boolean {
  if (error.code === "PGRST202" || error.code === "42883") return true;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("could not find the function") &&
    msg.includes("complete_funnel_submission")
  );
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`complete:${clientIp(req)}`, getRateLimitPerMinute()).ok) {
    return Response.json(
      { error: "Demasiados pedidos. Tente novamente." },
      { status: 429 }
    );
  }

  const parsed = completeSubmissionSchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const normalizedAnswers = parsed.data.answers
    .map((a) => ({
      question_key: a.question_key.trim(),
      answer: a.answer.trim(),
      ...(a.step_id ? { step_id: a.step_id } : {}),
    }))
    .filter((a) => a.question_key && a.answer);

  const fields = new Map(
    normalizedAnswers.map((a) => [a.question_key, a.answer])
  );
  if (fields.size !== normalizedAnswers.length) {
    return Response.json({ error: "Respostas duplicadas." }, { status: 400 });
  }

  const db = tryCreateServiceClient();
  if (!db) {
    return Response.json(
      { error: "Base de dados indisponível" },
      { status: 503 }
    );
  }

  const { submission_id, lead_id, session_id } = parsed.data;
  const { data, error } = await db.rpc("complete_funnel_submission", {
    p_submission_id: submission_id,
    p_lead_id: lead_id,
    p_session_id: session_id,
    p_answers: normalizedAnswers,
  });

  if (error) {
    // Fallback compatível quando a migração 009 ainda não foi aplicada na BD.
    if (isMissingRpcError(error)) {
      const { data: session, error: sErr } = await db
        .from("sessions")
        .select("id, lead_id")
        .eq("id", session_id)
        .maybeSingle();

      if (sErr) {
        console.error(sErr);
        return Response.json(
          { error: "Não foi possível guardar os dados. Tenta novamente." },
          { status: 500 }
        );
      }
      if (!session || session.lead_id !== lead_id) {
        return Response.json(
          { error: "Sessão ou submissão inválida" },
          { status: 409 }
        );
      }

      const { data: lead } = await db
        .from("leads")
        .select("funnel_completed, restaurant_name")
        .eq("id", lead_id)
        .maybeSingle();

      if (normalizedAnswers.length > 0) {
        const rows = normalizedAnswers.map((a) => ({
          lead_id,
          session_id,
          question_key: a.question_key,
          answer: a.answer,
          step_id: a.step_id || null,
        }));
        const { error: aErr } = await db
          .from("funnel_answers")
          .upsert(rows, { onConflict: "session_id,question_key" });
        if (aErr) {
          console.error(aErr);
          return Response.json(
            { error: "Não foi possível guardar os dados. Tenta novamente." },
            { status: 500 }
          );
        }
      }

      const now = new Date().toISOString();
      const nome = fields.get("nome");
      const { error: lErr } = await db
        .from("leads")
        .update({
          funnel_completed: true,
          contact_requested: true,
          ...(nome ? { restaurant_name: nome } : {}),
          last_activity_at: now,
          updated_at: now,
        })
        .eq("id", lead_id);
      if (lErr) {
        console.error(lErr);
        return Response.json(
          { error: "Não foi possível guardar os dados. Tenta novamente." },
          { status: 500 }
        );
      }

      await db
        .from("sessions")
        .update({ last_activity_at: now })
        .eq("id", session_id);

      return Response.json({
        ok: true,
        already_completed: Boolean(lead?.funnel_completed),
      });
    }

    console.error(error);
    const conflict = error.code === "22023" || error.code === "23505";
    return Response.json(
      {
        error:
          error.code === "23505"
            ? "Esta submissão já foi guardada com outros dados. Repõe os dados originais ou contacta a equipa."
            : error.code === "22023"
              ? "Sessão ou submissão inválida"
              : "Não foi possível guardar os dados. Tenta novamente.",
      },
      { status: conflict ? 409 : 500 }
    );
  }

  if (typeof data !== "boolean") {
    return Response.json(
      { error: "Não foi possível confirmar os dados. Tenta novamente." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, already_completed: !data });
}
