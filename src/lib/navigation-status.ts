import type { LeadRow, NavigationStatus } from "@/types";
import { getInactiveAfterMs } from "@/lib/env";

/**
 * Estado de navegação (técnico) — distinto do estado comercial.
 * Não afirma abandono definitivo; inatividade baseia-se no último evento.
 */
export function deriveNavigationStatus(
  lead: Pick<
    LeadRow,
    | "last_activity_at"
    | "funnel_completed"
    | "whatsapp_clicked"
    | "contact_requested"
  >,
  inactiveAfterMs = getInactiveAfterMs(),
  now = Date.now()
): NavigationStatus {
  if (!lead.last_activity_at) return "desconhecido";

  const last = new Date(lead.last_activity_at).getTime();
  if (!Number.isFinite(last)) return "desconhecido";

  // Prioridade de conversão
  if (lead.whatsapp_clicked) return "whatsapp";
  if (lead.contact_requested) return "contacto_pedido";
  if (lead.funnel_completed) return "analise_concluida";

  const age = now - last;
  if (age < 0) return "desconhecido";
  if (age <= inactiveAfterMs) return "ativo";
  return "inativo";
}

export function inactivityRuleDescription(inactiveAfterMs = getInactiveAfterMs()): string {
  const mins = Math.round(inactiveAfterMs / 60_000);
  return `Inativo se não houver eventos há mais de ${mins} minutos. Não significa abandono definitivo.`;
}
