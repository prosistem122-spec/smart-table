"use client";
import { getOrCreateVisitId } from "./visit";
import type { StepId } from "@/types";

const CONSENT_KEY = "st_journey_consent";
export function enableJourneyCapture() { sessionStorage.setItem(CONSENT_KEY, "yes"); }
export function clearJourneyConsent() { sessionStorage.removeItem(CONSENT_KEY); }
export function hasJourneyConsent() { return typeof window !== "undefined" && sessionStorage.getItem(CONSENT_KEY) === "yes"; }
function send(data: Record<string, unknown>) {
  const visit_id = getOrCreateVisitId();
  void fetch("/api/public/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visit_id, ...data }), keepalive: true }).catch(() => {});
}
export function journeyMilestone(milestone: "free_clicked_at" | "video_played_at" | "video_continued_at" | "analysis_clicked_at" | "name_step_seen_at") { send({ type: "milestone", milestone }); }
export function journeyAnswer(step_id: StepId, question_key: string, answer: string) {
  if (hasJourneyConsent() && answer.trim()) send({ type: "answer", consent: true, step_id, question_key, answer: answer.trim() });
}
export function journeyStep(step_id: StepId, duration_ms: number) {
  if (hasJourneyConsent()) send({ type: "step", consent: true, step_id, duration_ms: Math.min(86400000, Math.max(0, Math.round(duration_ms))) });
}

export function journeyStepSeen(step_id: StepId) {
  if (hasJourneyConsent()) send({ type: "step_seen", consent: true, step_id });
}
