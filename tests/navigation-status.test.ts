import { describe, expect, it } from "vitest";
import { deriveNavigationStatus } from "@/lib/navigation-status";

const base = {
  last_activity_at: new Date().toISOString(),
  funnel_completed: false,
  whatsapp_clicked: false,
  contact_requested: false,
};

describe("deriveNavigationStatus", () => {
  it("marca ativo quando atividade recente", () => {
    expect(deriveNavigationStatus(base, 15 * 60 * 1000)).toBe("ativo");
  });

  it("marca inativo após intervalo", () => {
    const old = {
      ...base,
      last_activity_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    };
    expect(deriveNavigationStatus(old, 15 * 60 * 1000)).toBe("inativo");
  });

  it("prioriza whatsapp", () => {
    expect(
      deriveNavigationStatus({ ...base, whatsapp_clicked: true, funnel_completed: true })
    ).toBe("whatsapp");
  });

  it("marca contacto pedido", () => {
    expect(
      deriveNavigationStatus({ ...base, contact_requested: true })
    ).toBe("contacto_pedido");
  });

  it("marca análise concluída", () => {
    expect(
      deriveNavigationStatus({ ...base, funnel_completed: true })
    ).toBe("analise_concluida");
  });

  it("desconhecido sem timestamp válido", () => {
    expect(
      deriveNavigationStatus({ ...base, last_activity_at: "invalid" })
    ).toBe("desconhecido");
  });
});
