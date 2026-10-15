"use client";

import type { Attribution, EventName, TrackingEventPayload } from "@/types";

const STORAGE_KEY = "st_tracking_ctx";
const QUEUE_KEY = "st_event_queue";
const MAX_QUEUE = 80;

export interface TrackingContext {
  leadId: string;
  sessionId: string;
  consentAnalytics: boolean;
  restaurantName: string;
  phoneNormalized: string;
}

type QueuedEvent = TrackingEventPayload & { client_id: string };

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function loadCtx(): TrackingContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrackingContext) : null;
  } catch {
    return null;
  }
}

function saveCtx(ctx: TrackingContext) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

function loadQueue(): QueuedEvent[] {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedEvent[]) {
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
const recentDedupe = new Set<string>();

export function getTrackingContext(): TrackingContext | null {
  return loadCtx();
}

export function setTrackingContext(ctx: TrackingContext) {
  saveCtx(ctx);
}

export function clearTrackingContext() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function track(
  event_name: EventName,
  payload: Omit<TrackingEventPayload, "event_name"> = {}
) {
  const ctx = loadCtx();
  if (!ctx?.consentAnalytics && event_name !== "lead_form_view" && event_name !== "landing_view") {
    // Sem consentimento de analytics, só eventos mínimos de formulário são enfileirados
    // após a sessão ser criada com consentimento.
  }

  if (payload.dedupe_key) {
    if (recentDedupe.has(payload.dedupe_key)) return;
    recentDedupe.add(payload.dedupe_key);
    if (recentDedupe.size > 200) {
      const first = recentDedupe.values().next().value;
      if (first) recentDedupe.delete(first);
    }
  }

  const item: QueuedEvent = {
    event_name,
    occurred_at: new Date().toISOString(),
    consent_analytics: ctx?.consentAnalytics,
    client_id: uid(),
    ...payload,
  };

  const q = loadQueue();
  q.push(item);
  saveQueue(q);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushEvents();
  }, 350);
}

export async function flushEvents(): Promise<boolean> {
  if (flushing) return true;
  const ctx = loadCtx();
  if (!ctx?.leadId || !ctx?.sessionId) return false;
  if (!ctx.consentAnalytics) {
    // Mantém fila local até haver consentimento + sessão
    return false;
  }

  const q = loadQueue();
  if (!q.length) return true;

  flushing = true;
  const batch = q.slice(0, 40);
  try {
    const res = await fetch("/api/public/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: ctx.leadId,
        session_id: ctx.sessionId,
        events: batch.map(({ client_id, ...rest }) => {
          void client_id;
          return rest;
        }),
      }),
      keepalive: true,
    });

    if (res.ok) {
      saveQueue(q.slice(batch.length));
      flushing = false;
      if (loadQueue().length) scheduleFlush();
      return true;
    }
    flushing = false;
    return false;
  } catch {
    flushing = false;
    return false;
  }
}

export function setupUnloadFlush() {
  if (typeof window === "undefined") return;
  const handler = () => {
    const ctx = loadCtx();
    const q = loadQueue();
    if (!ctx?.leadId || !ctx.sessionId || !q.length || !ctx.consentAnalytics) return;
    const body = JSON.stringify({
      lead_id: ctx.leadId,
      session_id: ctx.sessionId,
      events: q.slice(0, 40).map(({ client_id, ...rest }) => {
        void client_id;
        return rest;
      }),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/public/events",
        new Blob([body], { type: "application/json" })
      );
      saveQueue([]);
    }
  };
  window.addEventListener("pagehide", handler);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") handler();
  });
}

export async function startSession(input: {
  restaurant_name: string;
  phone: string;
  consent_analytics: boolean;
  consent_contact: boolean;
  attribution?: Attribution;
}): Promise<{ leadId: string; sessionId: string; resumed: boolean }> {
  const existing = loadCtx();
  const res = await fetch("/api/public/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      existing_lead_id: existing?.leadId,
      resume_session_id: existing?.sessionId,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Falha ao iniciar sessão");
  }

  const data = (await res.json()) as {
    lead_id: string;
    session_id: string;
    resumed: boolean;
    phone_normalized: string;
  };

  setTrackingContext({
    leadId: data.lead_id,
    sessionId: data.session_id,
    consentAnalytics: input.consent_analytics,
    restaurantName: input.restaurant_name.trim(),
    phoneNormalized: data.phone_normalized,
  });

  await flushEvents();
  return {
    leadId: data.lead_id,
    sessionId: data.session_id,
    resumed: data.resumed,
  };
}

export async function saveAnswers(
  answers: { question_key: string; answer: string; step_id?: string }[]
) {
  const ctx = loadCtx();
  if (!ctx?.leadId || !ctx.sessionId) return;
  try {
    await fetch("/api/public/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: ctx.leadId,
        session_id: ctx.sessionId,
        answers,
      }),
      keepalive: true,
    });
  } catch {
    /* não bloquear funil */
  }
}

export function startInactivityWatcher(inactiveAfterMs = 15 * 60 * 1000) {
  if (typeof window === "undefined") return () => {};
  let last = Date.now();
  let fired = false;

  const bump = () => {
    last = Date.now();
    fired = false;
  };

  const events = ["click", "keydown", "touchstart", "scroll"] as const;
  events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

  const iv = setInterval(() => {
    if (!fired && Date.now() - last >= inactiveAfterMs) {
      fired = true;
      track("session_inactive", {
        element_name: "inactivity_timer",
        action: "inactive",
        duration_ms: Date.now() - last,
        dedupe_key: `inactive_${loadCtx()?.sessionId}_${Math.floor(last / inactiveAfterMs)}`,
      });
      void flushEvents();
    }
  }, 30_000);

  return () => {
    clearInterval(iv);
    events.forEach((e) => window.removeEventListener(e, bump));
  };
}
