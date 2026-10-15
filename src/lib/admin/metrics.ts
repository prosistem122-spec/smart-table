import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveNavigationStatus } from "@/lib/navigation-status";
import { getInactiveAfterMs } from "@/lib/env";
import { STEP_IDS } from "@/types";

export interface MetricsFilters {
  from?: string;
  to?: string;
  commercial_status?: string;
  navigation_status?: string;
  step?: string;
  source?: string;
  campaign?: string;
}

export async function computeDashboardMetrics(
  supabase: SupabaseClient,
  filters: MetricsFilters = {}
) {
  const inactiveMs = getInactiveAfterMs();
  const now = Date.now();

  let leadsQuery = supabase.from("leads").select("*");
  if (filters.from) leadsQuery = leadsQuery.gte("created_at", filters.from);
  if (filters.to) leadsQuery = leadsQuery.lte("created_at", filters.to);
  if (filters.commercial_status) {
    leadsQuery = leadsQuery.eq("commercial_status", filters.commercial_status);
  }
  if (filters.source) {
    leadsQuery = leadsQuery.or(
      `source.eq.${filters.source},utm_source.eq.${filters.source}`
    );
  }
  if (filters.campaign) {
    leadsQuery = leadsQuery.eq("utm_campaign", filters.campaign);
  }

  const { data: leads, error } = await leadsQuery;
  if (error) throw error;

  let list = leads || [];

  if (filters.navigation_status) {
    list = list.filter(
      (l) => deriveNavigationStatus(l, inactiveMs, now) === filters.navigation_status
    );
  }
  if (filters.step) {
    list = list.filter((l) => l.last_step === filters.step);
  }

  const leadIds = list.map((l) => l.id);

  let sessionsCount = 0;
  let funnelStarted = 0;
  const whatsappClicks = list.filter((l) => l.whatsapp_clicked).length;
  const contactRequests = list.filter((l) => l.contact_requested).length;
  const completed = list.filter((l) => l.funnel_completed).length;
  const inactive = list.filter(
    (l) => deriveNavigationStatus(l, inactiveMs, now) === "inativo"
  ).length;

  if (leadIds.length) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .in("lead_id", leadIds);
    sessionsCount = count || 0;

    const { count: startedCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .in("lead_id", leadIds)
      .eq("event_name", "funnel_started");
    funnelStarted = startedCount || 0;
  }

  const uniqueVisitors = list.length;
  const completionRate =
    funnelStarted > 0 ? Math.round((completed / funnelStarted) * 1000) / 10 : 0;

  // Origens
  const sourcesMap = new Map<string, number>();
  for (const l of list) {
    const key = l.utm_source || l.source || "direto";
    sourcesMap.set(key, (sourcesMap.get(key) || 0) + 1);
  }
  const topSources = [...sourcesMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Drop-off por etapa (por leads únicos que alcançaram step_view)
  const dropOff = await computeStepDropOff(supabase, leadIds);

  // Atividade recente
  let recentActivity: unknown[] = [];
  if (leadIds.length) {
    const { data } = await supabase
      .from("events")
      .select(
        "id, event_name, occurred_at, step_id, element_name, action, lead_id, leads(restaurant_name)"
      )
      .in("lead_id", leadIds)
      .order("occurred_at", { ascending: false })
      .limit(20);
    recentActivity = data || [];
  }

  // Evolução temporal (por dia)
  const byDay = new Map<string, { leads: number; completed: number; whatsapp: number }>();
  for (const l of list) {
    const day = l.created_at.slice(0, 10);
    const row = byDay.get(day) || { leads: 0, completed: 0, whatsapp: 0 };
    row.leads += 1;
    if (l.funnel_completed) row.completed += 1;
    if (l.whatsapp_clicked) row.whatsapp += 1;
    byDay.set(day, row);
  }
  const timeline = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return {
    totals: {
      leads: list.length,
      unique_visitors: uniqueVisitors,
      sessions: sessionsCount,
      analyses_started: funnelStarted,
      analyses_completed: completed,
      completion_rate: completionRate,
      inactive,
      whatsapp_clicks: whatsappClicks,
      contact_requests: contactRequests,
    },
    top_sources: topSources,
    drop_off: dropOff,
    recent_activity: recentActivity,
    timeline,
    inactivity_rule: `Inativo após ${Math.round(inactiveMs / 60000)} min sem eventos.`,
  };
}

async function computeStepDropOff(supabase: SupabaseClient, leadIds: string[]) {
  if (!leadIds.length) {
    return STEP_IDS.map((step_id) => ({
      step_id,
      reached: 0,
      completed: 0,
      progressed: 0,
      progression_pct: 0,
      drop_pct: 0,
      median_duration_ms: null as number | null,
    }));
  }

  const { data: views } = await supabase
    .from("events")
    .select("lead_id, step_id, event_name, duration_ms, occurred_at")
    .in("lead_id", leadIds)
    .in("event_name", ["step_view", "step_completed"]);

  const rows = views || [];

  return STEP_IDS.map((step_id, idx) => {
    const next = STEP_IDS[idx + 1];
    const reachedLeads = new Set(
      rows
        .filter((r) => r.step_id === step_id && r.event_name === "step_view")
        .map((r) => r.lead_id)
    );
    const completedLeads = new Set(
      rows
        .filter((r) => r.step_id === step_id && r.event_name === "step_completed")
        .map((r) => r.lead_id)
    );
    const progressedLeads = next
      ? new Set(
          rows
            .filter((r) => r.step_id === next && r.event_name === "step_view")
            .map((r) => r.lead_id)
        )
      : completedLeads;

    const reached = reachedLeads.size;
    const completed = completedLeads.size;
    const progressed = [...progressedLeads].filter((id) => reachedLeads.has(id)).length;
    const progression_pct = reached ? Math.round((progressed / reached) * 1000) / 10 : 0;
    const drop_pct = reached ? Math.round(((reached - progressed) / reached) * 1000) / 10 : 0;

    const durations = rows
      .filter(
        (r) =>
          r.step_id === step_id &&
          r.event_name === "step_completed" &&
          typeof r.duration_ms === "number"
      )
      .map((r) => r.duration_ms as number)
      .sort((a, b) => a - b);

    const median_duration_ms = durations.length
      ? durations[Math.floor(durations.length / 2)]
      : null;

    return {
      step_id,
      reached,
      completed,
      progressed,
      progression_pct,
      drop_pct,
      median_duration_ms,
      note: "Desistência estimada = alcançaram etapa e não avançaram; inatividade ≠ abandono definitivo.",
    };
  });
}
