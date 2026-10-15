/** Tradução comercial de nomes técnicos de eventos (UI apenas). */

export function labelEventName(eventName: string): string {
  const map: Record<string, string> = {
    landing_view: "Visitou a página inicial",
    lead_form_view: "Viu o formulário de identificação",
    lead_form_submitted: "Preencheu os dados de contacto",
    funnel_started: "Iniciou o funil",
    step_view: "Visualizou uma etapa",
    step_completed: "Concluiu uma etapa",
    button_click: "Clicou num botão",
    answer_selected: "Selecionou uma resposta",
    step_back: "Regressou à etapa anterior",
    section_view: "Viu uma secção",
    calculator_used: "Utilizou a simulação",
    result_viewed: "Visualizou os resultados",
    cta_clicked: "Clicou numa chamada para acção",
    whatsapp_click: "Clicou no WhatsApp",
    contact_requested: "Pediu contacto",
    funnel_completed: "Concluiu a análise",
    session_resumed: "Retomou uma sessão",
    session_inactive: "Sessão marcada como inactiva",
  };
  return map[eventName] || eventName;
}

export function describeEvent(ev: {
  event_name: string;
  step_id?: string | null;
  element_name?: string | null;
  value?: string | null;
}): string {
  switch (ev.event_name) {
    case "step_view":
      return `Visualizou a etapa ${ev.step_id || "—"}`;
    case "step_completed":
      return `Concluiu a etapa ${ev.step_id || "—"}`;
    case "button_click":
      return `Clicou em ${ev.element_name || "botão"}`;
    case "answer_selected":
      return `Selecionou: ${ev.value || "—"}`;
    case "section_view":
      return `Viu a secção ${ev.element_name || "—"}`;
    case "cta_clicked":
      return `Clicou no CTA ${ev.element_name || ""}`.trim();
    default:
      return labelEventName(ev.event_name);
  }
}

export function isHighlightEvent(eventName: string): boolean {
  return [
    "lead_form_submitted",
    "funnel_started",
    "funnel_completed",
    "cta_clicked",
    "whatsapp_click",
    "contact_requested",
  ].includes(eventName);
}

export function formatStepLabel(stepId: string): string {
  return stepId.replace(/_/g, " ");
}
