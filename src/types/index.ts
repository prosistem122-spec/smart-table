export type CommercialStatus =
  | "novo"
  | "por_contactar"
  | "contactado"
  | "em_negociacao"
  | "convertido"
  | "sem_interesse";

export type NavigationStatus =
  | "ativo"
  | "inativo"
  | "analise_concluida"
  | "whatsapp"
  | "contacto_pedido"
  | "desconhecido";

export type EventName =
  | "landing_view"
  | "lead_form_view"
  | "lead_form_submitted"
  | "funnel_started"
  | "step_view"
  | "step_completed"
  | "button_click"
  | "answer_selected"
  | "step_back"
  | "section_view"
  | "scroll_depth"
  | "demo_step_view"
  | "calculator_used"
  | "result_viewed"
  | "cta_clicked"
  | "whatsapp_click"
  | "contact_requested"
  | "funnel_completed"
  | "session_resumed"
  | "session_inactive"
  | "video_play"
  | "video_progress"
  | "video_ended"
  | "page_dwell";

export interface Attribution {
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
}

export interface TrackingEventPayload {
  event_name: EventName;
  occurred_at?: string;
  page?: string;
  step_id?: string;
  step_index?: number;
  element_name?: string;
  action?: string;
  value?: string;
  previous_page?: string;
  next_page?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  dedupe_key?: string;
  consent_analytics?: boolean;
}

export interface LeadRow {
  id: string;
  restaurant_name: string;
  phone_raw: string;
  phone_normalized: string;
  consent_analytics: boolean;
  consent_contact: boolean;
  commercial_status: CommercialStatus;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  first_seen_at: string;
  last_activity_at: string;
  last_page: string | null;
  last_step: string | null;
  last_step_index: number | null;
  sessions_count: number;
  events_count: number;
  funnel_completed: boolean;
  whatsapp_clicked: boolean;
  contact_requested: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  lead_id: string;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  last_page: string | null;
  last_step: string | null;
  last_step_index: number | null;
  activity_status: "active" | "inactive" | "unknown";
  consent_analytics: boolean;
}

export interface EventRow {
  id: string;
  lead_id: string;
  session_id: string;
  event_name: string;
  occurred_at: string;
  page: string | null;
  step_id: string | null;
  step_index: number | null;
  element_name: string | null;
  action: string | null;
  value: string | null;
  previous_page: string | null;
  next_page: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
}

export const STEP_IDS = [
  "hero_intro",
  "hero_how_it_works",
  "restaurant_name",
  "restaurant_type",
  "restaurant_location",
  "contact_partial",
  "revenue",
  "tables",
  "recap",
  "revenue_state",
  "solution_preference",
  "accept_tool",
  "quiz_ticket",
  "calc_ticket",
  "quiz_ai",
  "pitch_smart_table",
  "result",
  "hero_social_proof",
  "contact_final",
  "thanks_whatsapp",
] as const;

export type StepId = (typeof STEP_IDS)[number];

export const COMMERCIAL_STATUS_LABELS: Record<CommercialStatus, string> = {
  novo: "Novo contacto",
  por_contactar: "Por contactar",
  contactado: "Contactado",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  sem_interesse: "Sem interesse",
};

export const NAVIGATION_STATUS_LABELS: Record<NavigationStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  analise_concluida: "Análise concluída",
  whatsapp: "Clicou no WhatsApp",
  contacto_pedido: "Pediu contacto",
  desconhecido: "Desconhecido",
};
