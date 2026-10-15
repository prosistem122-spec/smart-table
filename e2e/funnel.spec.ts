import { test, expect, devices } from "@playwright/test";

test.describe("Funil público", () => {
  test("mostra formulário de identificação e valida campos", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Smart Table").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analisar o meu restaurante" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Analisar o meu restaurante" }).click();
    await expect(page.getByText("Indica o nome do restaurante")).toBeVisible();

    await page.getByPlaceholder("Ex: Sabores da Baixa").fill("Restaurante Teste");
    await page.getByPlaceholder("+258 84 123 4567").fill("841234567");
    // Sem consentimento de contacto
    await page.getByText(/Autorizo a Smart Table a guardar/).click();
    await page.getByRole("button", { name: "Analisar o meu restaurante" }).click();
    await expect(page.getByText(/aceitar o contacto/i)).toBeVisible();
  });

  test("layout móvel carrega", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 12"],
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByText("Vamos analisar o potencial")).toBeVisible();
    await context.close();
  });
});
