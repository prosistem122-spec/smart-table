import { test, expect, devices } from "@playwright/test";

test.describe("Página de vendas + funil", () => {
  test("rota / apresenta a página de vendas", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /menu agora é/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Começar grátis|Quero o acesso grátis/i }).first()
    ).toBeVisible();
  });

  test("Começar grátis leva ao vídeo do funil", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Começar grátis|Quero o acesso grátis/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/analise/);
    await expect(page.getByText("Smart Table").first()).toBeVisible();
    await expect(
      page.getByText(/inteligência artificial|faturamento/i).first()
    ).toBeVisible();
  });

  test("/analise abre no VSL sem formulário de identificação", async ({
    page,
  }) => {
    await page.goto("/analise");
    await expect(page.getByText("Smart Table").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analisar o meu restaurante" })
    ).toHaveCount(0);
    await expect(
      page.getByText(/Vamos analisar o potencial do teu restaurante/i)
    ).toHaveCount(0);
  });

  test("layout móvel da página de vendas carrega", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 12"],
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByText(/garçom virtual/i).first()).toBeVisible();
    await context.close();
  });
});
