import { describe, expect, it } from "vitest";
import { visualProgress } from "@/lib/video/settings";

describe("visualProgress (timeline manipulada)", () => {
  it("é linear quando a curva é 1", () => {
    expect(visualProgress(0.5, 1)).toBeCloseTo(0.5, 5);
    expect(visualProgress(0.25, 1)).toBeCloseTo(0.25, 5);
  });

  it("avança mais rápido no início com curva > 1", () => {
    const atQuarter = visualProgress(0.25, 2.5);
    expect(atQuarter).toBeGreaterThan(0.25);
    expect(atQuarter).toBeLessThan(1);
  });

  it("abrandar no fim: últimos 25% reais avançam menos na barra", () => {
    const mid = visualProgress(0.5, 2.5);
    const late = visualProgress(0.75, 2.5);
    const earlyGain = mid - visualProgress(0.25, 2.5);
    const lateGain = late - mid;
    expect(earlyGain).toBeGreaterThan(lateGain);
  });

  it("clampa 0 e 1", () => {
    expect(visualProgress(-1, 2)).toBe(0);
    expect(visualProgress(2, 2)).toBe(1);
  });
});
