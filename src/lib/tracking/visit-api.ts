"use client";

import { readClientAttribution } from "@/lib/attribution";
import { getOrCreateVisitId } from "@/lib/tracking/visit";

export type VisitPage = "landing" | "video";

/** Regista visita anónima (landing / vídeo) — sem criar lead. */
export async function recordPageVisit(page: VisitPage): Promise<void> {
  try {
    const visit_id = getOrCreateVisitId();
    const attribution = readClientAttribution();
    await fetch("/api/public/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visit_id, page, attribution }),
      keepalive: true,
    });
  } catch {
    /* não bloquear a UI */
  }
}
