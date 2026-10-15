import { describe, expect, it } from "vitest";
import { normalizePhone, isValidPhone, formatPhoneDisplay } from "@/lib/phone";

describe("normalizePhone", () => {
  it("aceita número MZ local 9 dígitos", () => {
    const r = normalizePhone("841234567");
    expect(r.ok).toBe(true);
    expect(r.e164).toBe("+258841234567");
  });

  it("aceita +258 com espaços", () => {
    const r = normalizePhone("+258 84 123 4567");
    expect(r.ok).toBe(true);
    expect(r.e164).toBe("+258841234567");
  });

  it("aceita prefixo 258 sem +", () => {
    const r = normalizePhone("258851112233");
    expect(r.ok).toBe(true);
    expect(r.e164).toBe("+258851112233");
  });

  it("rejeita vazio", () => {
    expect(normalizePhone("").ok).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("rejeita MZ inválido", () => {
    expect(normalizePhone("+258821234567").ok).toBe(false);
  });

  it("formata display MZ", () => {
    expect(formatPhoneDisplay("+258841234567")).toBe("+258 84 123 4567");
  });
});
