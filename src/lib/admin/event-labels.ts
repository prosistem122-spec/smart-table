/** Tradução comercial de nomes técnicos de eventos (UI apenas). */

export function labelEventName(eventName: string): string {
  const map: Record<string, string> = {
    landing_view: "Visitou a página de vendas",
    lead_form_view: "Viu o formulário de identificação",
    lead_form_submitted: "Preencheu os dados de contacto",
    funnel_started: "Iniciou o funil de análise",
    step_view: "Visualizou uma etapa",
    step_completed: "Concluiu uma etapa",
    button_click: "Clicou num botão",
    answer_selected: "Selecionou uma resposta",
    step_back: "Regressou à etapa anterior",
    section_view: "Viu uma secção",
    scroll_depth: "Profundidade de scroll",
    demo_step_view: "Interagiu com a demonstração",
    calculator_used: "Utilizou a simulação",
    result_viewed: "Visualizou os resultados",
    cta_clicked: "Clicou em «Começar grátis» / CTA",
    whatsapp_click: "Clicou no WhatsApp",
    contact_requested: "Pediu contacto",
    funnel_completed: "Concluiu a análise",
    session_resumed: "Retomou uma sessão",
    session_inactive: "Sessão marcada como inactiva (não prova abandono)",
    video_play: "Reproduziu o vídeo",
    video_progress: "Progresso do vídeo",
    video_ended: "Terminou o vídeo",
    page_dwell: "Tempo na página",
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
    case "scroll_depth":
      return `Scroll ≈ ${ev.value || "—"}%`;
    case "demo_step_view":
      return `Demonstração · passo ${ev.value || ev.step_id || "—"}`;
    case "cta_clicked":
      return `Clicou no CTA ${ev.element_name || ""}`.trim();
    case "landing_view":
      return "Entrou na página de vendas";
    case "funnel_started":
      return "Entrou no funil original de 20 etapas";
    case "video_play":
      return `Reproduziu o vídeo (${ev.step_id || "—"})`;
    case "video_progress":
      return `Vídeo ≈ ${ev.value || "—"}% (${ev.step_id || "—"})`;
    case "video_ended":
      return `Concluiu o vídeo (${ev.step_id || "—"})`;
    case "page_dwell":
      return `Permanência em ${ev.step_id || "página"}`;
    default:
      return labelEventName(ev.event_name);
  }
}

export function isHighlightEvent(eventName: string): boolean {
  return [
    "landing_view",
    "lead_form_submitted",
    "funnel_started",
    "funnel_completed",
    "cta_clicked",
    "demo_step_view",
    "whatsapp_click",
    "contact_requested",
  ].includes(eventName);
}

export function formatStepLabel(stepId: string): string {
  return stepId.replace(/_/g, " ");
}
