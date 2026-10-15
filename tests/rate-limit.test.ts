import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("permite até ao limite e depois bloqueia", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(rateLimit(key, 3).ok).toBe(true);
    expect(rateLimit(key, 3).ok).toBe(true);
    expect(rateLimit(key, 3).ok).toBe(true);
    expect(rateLimit(key, 3).ok).toBe(false);
  });
});
