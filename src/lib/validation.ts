import { z } from "zod";

const EVENT_NAMES = [
  "landing_view",
  "lead_form_view",
  "lead_form_submitted",
  "funnel_started",
  "step_view",
  "step_completed",
  "button_click",
  "answer_selected",
  "step_back",
  "section_view",
  "calculator_used",
  "result_viewed",
  "cta_clicked",
  "whatsapp_click",
  "contact_requested",
  "funnel_completed",
  "session_resumed",
  "session_inactive",
] as const;

const metadataSchema = z
  .record(z.string(), z.unknown())
  .refine((obj) => JSON.stringify(obj).length <= 2000, {
    message: "metadata demasiado grande",
  });

export const sessionStartSchema = z.object({
  restaurant_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  consent_analytics: z.boolean(),
  consent_contact: z.boolean(),
  resume_session_id: z.string().uuid().optional().nullable(),
  existing_lead_id: z.string().uuid().optional().nullable(),
  attribution: z
    .object({
      source: z.string().max(120).optional().nullable(),
      utm_source: z.string().max(120).optional().nullable(),
      utm_medium: z.string().max(120).optional().nullable(),
      utm_campaign: z.string().max(120).optional().nullable(),
      utm_content: z.string().max(120).optional().nullable(),
      utm_term: z.string().max(120).optional().nullable(),
      referrer: z.string().max(500).optional().nullable(),
    })
    .optional(),
  user_agent: z.string().max(400).optional().nullable(),
});

export const eventItemSchema = z.object({
  event_name: z.enum(EVENT_NAMES),
  occurred_at: z.string().datetime().optional(),
  page: z.string().max(120).optional(),
  step_id: z.string().max(80).optional(),
  step_index: z.number().int().min(0).max(100).optional(),
  element_name: z.string().max(120).optional(),
  action: z.string().max(80).optional(),
  value: z.string().max(500).optional(),
  previous_page: z.string().max(120).optional(),
  next_page: z.string().max(120).optional(),
  duration_ms: z.number().int().min(0).max(86_400_000).optional(),
  metadata: metadataSchema.optional(),
  dedupe_key: z.string().max(120).optional(),
  consent_analytics: z.boolean().optional(),
});

export const eventsBatchSchema = z.object({
  lead_id: z.string().uuid(),
  session_id: z.string().uuid(),
  events: z.array(eventItemSchema).min(1).max(40),
});

export const answersSchema = z.object({
  lead_id: z.string().uuid(),
  session_id: z.string().uuid(),
  answers: z
    .array(
      z.object({
        question_key: z.string().min(1).max(80),
        answer: z.string().min(1).max(500),
        step_id: z.string().max(80).optional(),
      })
    )
    .min(1)
    .max(30),
});

export const commercialUpdateSchema = z.object({
  commercial_status: z.enum([
    "novo",
    "por_contactar",
    "contactado",
    "em_negociacao",
    "convertido",
    "sem_interesse",
  ]),
  note: z.string().trim().max(4000).optional(),
});

export const noteCreateSchema = z.object({
  note: z.string().trim().min(1).max(4000),
});

const FORBIDDEN_META_KEYS = [
  "password",
  "token",
  "secret",
  "card",
  "cvv",
  "fingerprint",
  "payment",
];

export function sanitizeMetadata(
  meta: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    if (FORBIDDEN_META_KEYS.some((f) => lower.includes(f))) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = v.slice(0, 500);
    } else if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null
    ) {
      out[k] = v;
    }
  }
  return out;
}
