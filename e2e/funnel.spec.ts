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

  test("Começar grátis leva à secção de contacto", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Começar grátis|Quero o acesso grátis/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/#acesso/);
    await expect(page.locator("#acesso h2")).toBeVisible();
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

  test("a equipa está antes do rodapé", async ({ page }) => {
    await page.goto("/");
    const team = page.locator("#equipa");
    await team.scrollIntoViewIfNeeded();
    await expect(team.getByText("Kadjetha Lazaro").first()).toBeVisible();
    await expect(team.getByText("Reginaldo Jossias").first()).toBeVisible();
    await expect(team.getByText("Abel Mario").first()).toBeVisible();
    await expect(team.getByText("Alfredo", { exact: true }).first()).toBeVisible();
    expect(await team.evaluate((el) => el.nextElementSibling?.tagName)).toBe("FOOTER");
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
