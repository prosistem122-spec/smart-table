import { describe, expect, it } from "vitest";
import { journeySchema } from "@/lib/tracking/journey-validation";

const visit_id = "visit-12345678";
describe("rastreamento do percurso", () => {
  it("aceita apenas marcos conhecidos", () => {
    expect(journeySchema.safeParse({ type: "milestone", visit_id, milestone: "video_played_at" }).success).toBe(true);
    expect(journeySchema.safeParse({ type: "milestone", visit_id, milestone: "invalid" }).success).toBe(false);
  });
  it("exige autorização para respostas e tempos", () => {
    const answer = { type: "answer", visit_id, question_key: "nome", answer: "Restaurante", step_id: "restaurant_name" };
    expect(journeySchema.safeParse(answer).success).toBe(false);
    expect(journeySchema.safeParse({ ...answer, consent: true }).success).toBe(true);
    expect(journeySchema.safeParse({ type: "step", visit_id, step_id: "restaurant_name", duration_ms: 1000 }).success).toBe(false);
    expect(journeySchema.safeParse({ type: "step", visit_id, step_id: "restaurant_name", duration_ms: 1000, consent: true }).success).toBe(true);
  });
  it("rejeita dados inválidos", () => {
    expect(journeySchema.safeParse({ type: "answer", visit_id, question_key: "nome", answer: "", step_id: "restaurant_name", consent: true }).success).toBe(false);
    expect(journeySchema.safeParse({ type: "step", visit_id, step_id: "invalid", duration_ms: -1, consent: true }).success).toBe(false);
  });
});

describe("visualização de etapas", () => {
  it("exige autorização e uma etapa válida", () => {
    const seen = { type: "step_seen", visit_id, step_id: "restaurant_type" };
    expect(journeySchema.safeParse(seen).success).toBe(false);
    expect(journeySchema.safeParse({ ...seen, consent: true }).success).toBe(true);
    expect(journeySchema.safeParse({ ...seen, step_id: "desconhecido", consent: true }).success).toBe(false);
  });
});
