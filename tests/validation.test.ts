import { describe, expect, it } from "vitest";
import {
  sessionStartSchema,
  eventsBatchSchema,
  sanitizeMetadata,
} from "@/lib/validation";

describe("sessionStartSchema", () => {
  it("valida payload mínimo", () => {
    const r = sessionStartSchema.safeParse({
      restaurant_name: "Sabores",
      phone: "+258841234567",
      consent_analytics: true,
      consent_contact: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejeita nome curto", () => {
    const r = sessionStartSchema.safeParse({
      restaurant_name: "A",
      phone: "+258841234567",
      consent_analytics: true,
      consent_contact: true,
    });
    expect(r.success).toBe(false);
  });
});

describe("eventsBatchSchema", () => {
  it("aceita batch válido", () => {
    const r = eventsBatchSchema.safeParse({
      lead_id: "11111111-1111-4111-8111-111111111111",
      session_id: "22222222-2222-4222-8222-222222222222",
      events: [
        {
          event_name: "step_view",
          step_id: "hero_intro",
          dedupe_key: "step_view_hero_intro",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita evento desconhecido", () => {
    const r = eventsBatchSchema.safeParse({
      lead_id: "11111111-1111-4111-8111-111111111111",
      session_id: "22222222-2222-4222-8222-222222222222",
      events: [{ event_name: "mouse_move" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("sanitizeMetadata", () => {
  it("remove chaves sensíveis", () => {
    const out = sanitizeMetadata({
      ok: "yes",
      password: "secret",
      token: "x",
      card_number: "4111",
    });
    expect(out).toEqual({ ok: "yes" });
  });
});
