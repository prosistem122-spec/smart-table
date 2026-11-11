"use client";

declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

/** Chamado apenas depois de o servidor confirmar a submissão. */
export function trackConfirmedLead(submissionId: string) {
  try { window.fbq?.("track", "Lead", {}, { eventID: submissionId }); } catch { /* O pixel não deve impedir a confirmação do contacto. */ }
}
