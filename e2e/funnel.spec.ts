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

  test("Começar grátis leva ao formulário de identificação", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Começar grátis|Quero o acesso grátis/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/analise/);
    await expect(page.getByText("Vamos analisar o potencial")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analisar o meu restaurante" })
    ).toBeVisible();
  });

  test("formulário em /analise valida campos", async ({ page }) => {
    await page.goto("/analise");
    await expect(page.getByText("Smart Table").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analisar o meu restaurante" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Analisar o meu restaurante" }).click();
    await expect(page.getByText("Indica o nome do restaurante")).toBeVisible();

    await page.getByPlaceholder("Ex: Sabores da Baixa").fill("Restaurante Teste");
    await page.getByPlaceholder("+258 84 123 4567").fill("841234567");
    await page.getByText(/Autorizo a Smart Table a guardar/).click();
    await page.getByRole("button", { name: "Analisar o meu restaurante" }).click();
    await expect(page.getByText(/aceitar o contacto/i)).toBeVisible();
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
