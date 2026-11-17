// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initSalesLanding } from "@/components/sales/initSalesLanding";
import { getWhatsAppNumber } from "@/lib/env";
import {
  WHATSAPP_NUMBER,
  buildLandingWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";

const salesHtml = readFileSync(
  resolve(process.cwd(), "src/components/sales/sales-body.html"),
  "utf8"
);

describe("WhatsApp e formulário da Landing Page", () => {
  let cleanup: (() => void) | null = null;
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.className = "st-sales";
    root.innerHTML = salesHtml;
    document.body.appendChild(root);
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    root.remove();
    vi.restoreAllMocks();
  });

  it("configura +258 853003836 em todos os botões de WhatsApp da landing page e no helper global", () => {
    expect(WHATSAPP_NUMBER).toBe("258853003836");
    expect(getWhatsAppNumber()).toBe("258853003836");
    expect(buildWhatsAppUrl("Olá")).toBe(
      "https://wa.me/258853003836?text=Ol%C3%A1"
    );

    cleanup = initSalesLanding({ whatsappNumber: "258840000000" });

    const waLinks = root.querySelectorAll<HTMLAnchorElement>(
      "[data-wa], [data-wat], a.fab"
    );
    expect(waLinks.length).toBeGreaterThanOrEqual(4);
    waLinks.forEach((a) => {
      expect(a.href.startsWith("https://wa.me/258853003836?text=")).toBe(true);
    });

    const telLink = root.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
    expect(telLink?.getAttribute("href")).toBe("tel:+258853003836");

    // Campos do formulário inferior não são obrigatórios.
    expect(
      root.querySelectorAll("#f [required]").length
    ).toBe(0);
  });

  it("ao clicar em 'Começar grátis' abre o WhatsApp +258 853003836 com mensagem pré-preenchida com os dados inseridos", () => {
    const onCtaClick = vi.fn();
    const onWhatsAppClick = vi.fn();
    cleanup = initSalesLanding({
      whatsappNumber: WHATSAPP_NUMBER,
      onCtaClick,
      onWhatsAppClick,
    });

    const form = root.querySelector<HTMLFormElement>("#f")!;
    form.querySelector<HTMLInputElement>('[name="n"]')!.value = "João Silva";
    form.querySelector<HTMLInputElement>('[name="r"]')!.value =
      "Sabores da Baixa";
    form.querySelector<HTMLInputElement>('[name="t"]')!.value =
      "+258 84 999 8888";
    form.querySelector<HTMLSelectElement>('[name="m"]')!.value =
      "11 a 25 mesas";

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target] = vi.mocked(window.open).mock.calls[0];
    expect(target).toBe("_blank");
    const parsed = new URL(String(url));
    expect(parsed.origin + parsed.pathname).toBe(
      "https://wa.me/258853003836"
    );
    const text = parsed.searchParams.get("text")!;
    expect(text).toBe(
      buildLandingWhatsAppMessage({
        name: "João Silva",
        restaurant: "Sabores da Baixa",
        whatsapp: "+258 84 999 8888",
        tables: "11 a 25 mesas",
      })
    );
    expect(text).toContain("Nome: João Silva");
    expect(text).toContain("Restaurante: Sabores da Baixa");
    expect(text).toContain("WhatsApp: +258 84 999 8888");
    expect(text).toContain("Mesas: 11 a 25 mesas");

    expect(onCtaClick).toHaveBeenCalledWith("form_comecar_gratis");
    expect(onWhatsAppClick).toHaveBeenCalledWith("form_comecar_gratis");

    // Mostra também link direto de fallback com a mesma mensagem pré-preenchida.
    const fallbackLink =
      root.querySelector<HTMLAnchorElement>("#ok a[href^='https://wa.me/']");
    expect(fallbackLink?.href).toBe(String(url));
  });

  it("permite submeter 'Começar grátis' sem preencher campos obrigatórios (vazio ou parcial)", () => {
    cleanup = initSalesLanding({ whatsappNumber: WHATSAPP_NUMBER });
    const form = root.querySelector<HTMLFormElement>("#f")!;

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url] = vi.mocked(window.open).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin + parsed.pathname).toBe(
      "https://wa.me/258853003836"
    );
    expect(parsed.searchParams.get("text")).toBe(
      "Olá! Quero começar grátis com a Smarttable."
    );
  });
});
