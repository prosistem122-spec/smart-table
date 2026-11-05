import { requireAdmin } from "@/lib/admin/auth";
import { authErrorResponse } from "@/lib/admin/errors";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const columns = ["free_clicked_at", "video_played_at", "video_continued_at", "analysis_clicked_at", "name_step_seen_at"] as const;
    const [landing, videoPage, ...milestones] = await Promise.all([
      db.from("page_visits").select("visit_id", { count: "exact", head: true }).not("landing_seen_at", "is", null),
      db.from("page_visits").select("visit_id", { count: "exact", head: true }).not("video_seen_at", "is", null),
      ...columns.map((col) => db.from("tracking_milestones").select("visit_id", { count: "exact", head: true }).not(col, "is", null)),
    ]);
    for (const r of [landing, videoPage, ...milestones]) if (r.error) throw r.error;
    const chartStats = await db.rpc("tracking_journey_chart_stats");
    if (chartStats.error) throw chartStats.error;
    const names = await db.from("tracking_answers").select("visit_id, answer, updated_at").eq("question_key", "nome").order("updated_at", { ascending: false }).limit(100);
    if (names.error) throw names.error;
    const ids = (names.data || []).map((r) => r.visit_id);
    const answers: { visit_id: string; question_key: string; answer: string; step_id: string; updated_at: string }[] = [];
    const steps: { visit_id: string; step_id: string; duration_ms: number; duration_recorded: boolean; updated_at: string }[] = [];
    const sessions: { visit_id: string; lead_id: string; started_at: string }[] = [];
    if (ids.length) {
      // Lotes evitam o limite de linhas por resposta do PostgREST.
      for (let i = 0; i < ids.length; i += 20) {
        const batch = ids.slice(i, i + 20);
        const results = await Promise.all([
          db.from("tracking_answers").select("visit_id,question_key,answer,step_id,updated_at").in("visit_id", batch).limit(1000),
          db.from("tracking_steps").select("visit_id,step_id,duration_ms,duration_recorded,updated_at").in("visit_id", batch).limit(1000),
          db.from("sessions").select("visit_id,lead_id,started_at").in("visit_id", batch).order("started_at", { ascending: false }).limit(1000),
        ]);
        for (const r of results) if (r.error) throw r.error;
        answers.push(...(results[0].data || [])); steps.push(...(results[1].data || [])); sessions.push(...(results[2].data || []));
      }
    }
    return Response.json({
      chart_stats: chartStats.data || [],
      counts: { landing: landing.count || 0, video_page: videoPage.count || 0, ...Object.fromEntries(columns.map((c, i) => [c, milestones[i].count || 0])) },
      restaurants: (names.data || []).map((name) => ({ visit_id: name.visit_id, name: name.answer, updated_at: name.updated_at,
        answers: answers.filter((a) => a.visit_id === name.visit_id), steps: steps.filter((s) => s.visit_id === name.visit_id),
        lead_id: sessions.find((s) => s.visit_id === name.visit_id)?.lead_id || null,
      })),
    });
  } catch (err) { return authErrorResponse(err); }
}
