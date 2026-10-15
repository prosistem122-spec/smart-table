import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { authErrorResponse } from "@/lib/admin/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { deriveNavigationStatus, inactivityRuleDescription } from "@/lib/navigation-status";
import { commercialUpdateSchema } from "@/lib/validation";
import { STEP_IDS } from "@/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const supabase = createServiceClient();

    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!lead) return Response.json({ error: "Não encontrado" }, { status: 404 });

    const [{ data: sessions }, { data: events }, { data: answers }, { data: notes }] =
      await Promise.all([
        supabase
          .from("sessions")
          .select("*")
          .eq("lead_id", id)
          .order("started_at", { ascending: false }),
        supabase
          .from("events")
          .select("*")
          .eq("lead_id", id)
          .order("occurred_at", { ascending: true })
          .limit(1000),
        supabase
          .from("funnel_answers")
          .select("*")
          .eq("lead_id", id)
          .order("recorded_at", { ascending: true }),
        supabase
          .from("lead_notes")
          .select("*")
          .eq("lead_id", id)
          .order("created_at", { ascending: false }),
      ]);

    const completedSteps = new Set(
      (events || [])
        .filter((e) => e.event_name === "step_completed" && e.step_id)
        .map((e) => e.step_id as string)
    );

    const lastButton = [...(events || [])]
      .reverse()
      .find((e) => e.event_name === "button_click" || e.event_name === "cta_clicked");
    const lastAnswer = [...(events || [])]
      .reverse()
      .find((e) => e.event_name === "answer_selected");

    const interactionMs = (events || []).reduce(
      (acc, e) => acc + (e.duration_ms || 0),
      0
    );

    return Response.json({
      lead: {
        ...lead,
        navigation_status: deriveNavigationStatus(lead),
      },
      sessions: sessions || [],
      events: events || [],
      answers: answers || [],
      notes: notes || [],
      behavioral: {
        sessions_count: lead.sessions_count,
        events_count: lead.events_count,
        completed_steps: [...completedSteps],
        pending_steps: STEP_IDS.filter((s) => !completedSteps.has(s)),
        last_activity_at: lead.last_activity_at,
        last_page: lead.last_page,
        last_step: lead.last_step,
        last_button: lastButton?.element_name || null,
        last_answer: lastAnswer?.value || null,
        funnel_completed: lead.funnel_completed,
        whatsapp_clicked: lead.whatsapp_clicked,
        contact_requested: lead.contact_requested,
        approx_interaction_ms: interactionMs,
        inactivity_rule: inactivityRuleDescription(),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = commercialUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("commercial_status")
      .eq("id", id)
      .maybeSingle();

    if (!lead) return Response.json({ error: "Não encontrado" }, { status: 404 });

    const { error } = await supabase
      .from("leads")
      .update({
        commercial_status: parsed.data.commercial_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    if (
      parsed.data.note ||
      parsed.data.commercial_status !== lead.commercial_status
    ) {
      await supabase.from("lead_notes").insert({
        lead_id: id,
        admin_user_id: admin.userId,
        admin_email: admin.email,
        note:
          parsed.data.note ||
          `Estado comercial alterado para ${parsed.data.commercial_status}`,
        previous_commercial_status: lead.commercial_status,
        new_commercial_status: parsed.data.commercial_status,
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
