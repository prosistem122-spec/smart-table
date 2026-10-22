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

    /** Tempo por página/etapa: máximo duration visto em step_completed / page_dwell / vídeo */
    const pageTimeMap = new Map<
      string,
      { page: string; step_id: string; duration_ms: number; source: string }
    >();
    for (const e of events || []) {
      const stepKey = e.step_id || e.page || "unknown";
      const page = e.page || "funnel";
      const dur = e.duration_ms || 0;
      if (dur <= 0) continue;
      if (
        e.event_name !== "step_completed" &&
        e.event_name !== "page_dwell" &&
        e.event_name !== "video_progress" &&
        e.event_name !== "video_ended" &&
        e.event_name !== "step_back"
      ) {
        continue;
      }
      const prev = pageTimeMap.get(stepKey);
      if (!prev || dur > prev.duration_ms) {
        pageTimeMap.set(stepKey, {
          page,
          step_id: e.step_id || stepKey,
          duration_ms: dur,
          source: e.event_name,
        });
      }
    }

    /** Fallback: diferença de timestamps entre step_view consecutivos */
    const views = (events || []).filter((e) => e.event_name === "step_view");
    for (let i = 0; i < views.length; i++) {
      const cur = views[i];
      const next = views[i + 1];
      const start = new Date(cur.occurred_at).getTime();
      const end = next
        ? new Date(next.occurred_at).getTime()
        : new Date(
            (sessions || []).find((s) => s.id === cur.session_id)
              ?.last_activity_at || cur.occurred_at
          ).getTime();
      const dur = Math.max(0, end - start);
      if (dur <= 0 || !cur.step_id) continue;
      const prev = pageTimeMap.get(cur.step_id);
      if (!prev || (prev.source === "step_view_gap" && dur > prev.duration_ms)) {
        if (!prev) {
          pageTimeMap.set(cur.step_id, {
            page: cur.page || "funnel",
            step_id: cur.step_id,
            duration_ms: dur,
            source: "step_view_gap",
          });
        }
      }
    }

    const page_times = [...pageTimeMap.values()].sort(
      (a, b) => b.duration_ms - a.duration_ms
    );

    const totalSessionMs = (sessions || []).reduce((acc, s) => {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.last_activity_at || s.ended_at || s.started_at).getTime();
      return acc + Math.max(0, end - start);
    }, 0);

    const videoWatchMs = (events || [])
      .filter((e) => e.event_name === "video_ended" || e.event_name === "video_progress")
      .reduce((acc, e) => Math.max(acc, e.duration_ms || 0), 0);

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
        total_session_ms: totalSessionMs,
        video_watch_ms: videoWatchMs,
        page_times,
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
