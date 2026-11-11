import { z } from "zod";
import { STEP_IDS } from "@/types";

const key = "st_funnel_progress_v1";
const strings = z.record(z.string().max(100), z.string().max(2000));
const schema = z.object({
  version: z.literal(1),
  cur: z.number().int().min(0).max(STEP_IDS.length - 1),
  ans: strings,
  quizSel: strings,
  contactDraft: strings,
  inputValue: z.string().max(2000),
  contactExpanded: z.boolean(),
  calcPct: z.number().min(0).max(100),
  journeyConsent: z.boolean(),
  captureEnabled: z.boolean(),
  partialSubmissionId: z.string().uuid(),
  partialPhone: z.string().max(40).nullable(),
  finalSubmissionId: z.string().uuid(),
  completed: z.boolean(),
});
export type FunnelProgress = z.infer<typeof schema>;
export function readFunnelProgress(): FunnelProgress | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch { return null; }
}
export function writeFunnelProgress(progress: FunnelProgress): boolean {
  try { sessionStorage.setItem(key, JSON.stringify(progress)); return true; } catch { return false; }
}
