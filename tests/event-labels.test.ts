import { describe, expect, it } from "vitest";
import {
  describeEvent,
  isHighlightEvent,
  labelEventName,
} from "@/lib/admin/event-labels";

describe("event-labels sales journey", () => {
  it("traduz eventos da página de vendas", () => {
    expect(labelEventName("landing_view")).toMatch(/vendas/i);
    expect(labelEventName("scroll_depth")).toMatch(/scroll/i);
    expect(labelEventName("demo_step_view")).toMatch(/demonstração/i);
  });

  it("descreve profundidade e demo", () => {
    expect(describeEvent({ event_name: "scroll_depth", value: "75" })).toContain(
      "75"
    );
    expect(
      describeEvent({ event_name: "demo_step_view", value: "3" })
    ).toContain("3");
  });

  it("destaca entrada na página de vendas e CTA", () => {
    expect(isHighlightEvent("landing_view")).toBe(true);
    expect(isHighlightEvent("cta_clicked")).toBe(true);
    expect(isHighlightEvent("demo_step_view")).toBe(true);
  });
});
