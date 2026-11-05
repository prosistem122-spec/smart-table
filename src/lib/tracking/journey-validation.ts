import { z } from "zod";
import { STEP_IDS } from "@/types";

export const journeySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("milestone"), visit_id: z.string().trim().min(8).max(80), milestone: z.enum(["free_clicked_at", "video_played_at", "video_continued_at", "analysis_clicked_at", "name_step_seen_at"]) }),
  z.object({ type: z.literal("answer"), visit_id: z.string().trim().min(8).max(80), step_id: z.enum(STEP_IDS), question_key: z.string().regex(/^[a-zA-Z0-9_]{1,80}$/), answer: z.string().trim().min(1).max(500), consent: z.literal(true) }),
  z.object({ type: z.literal("step_seen"), visit_id: z.string().trim().min(8).max(80), step_id: z.enum(STEP_IDS), consent: z.literal(true) }),
  z.object({ type: z.literal("step"), visit_id: z.string().trim().min(8).max(80), step_id: z.enum(STEP_IDS), duration_ms: z.number().int().min(0).max(86400000), consent: z.literal(true) }),
]);
