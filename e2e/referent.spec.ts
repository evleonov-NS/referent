import { expect, test } from "@playwright/test";

test.describe("Референт", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("открывает главную страницу", async ({ page }) => {
    await expect(page).toHaveTitle(/Референт/);
    await expect(
      page.getByRole("heading", { name: "Референт", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("AI-помощник для анализа иностранных статей и писем"),
    ).toBeVisible();
  });

  test("показывает секции статей и писем", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Статьи", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Письма", level: 2 })).toBeVisible();
    await expect(page.getByLabel("Статья")).toBeVisible();
    await expect(page.getByLabel("Текст письма")).toBeVisible();
  });

  test("показывает кнопки действий", async ({ page }) => {
    await expect(page.getByRole("button", { name: "О чем статья?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Тезисы" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Подробный перевод" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Перевести письмо" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Подготовить ответ" })).toBeVisible();
  });

  test("требует текст письма для перевода", async ({ page }) => {
    await page.getByRole("button", { name: "Перевести письмо" }).click();
    await expect(page.getByText("Вставьте текст письма.")).toBeVisible();
  });

  test("требует текст письма для подготовки ответа", async ({ page }) => {
    await page.getByRole("button", { name: "Подготовить ответ" }).click();
    await expect(page.getByText("Вставьте текст письма.")).toBeVisible();
  });

  test("требует ввод статьи для подробного перевода", async ({ page }) => {
    await page.getByRole("button", { name: "Подробный перевод" }).click();
    await expect(
      page.getByText("Вставьте ссылку на статью или текст."),
    ).toBeVisible();
  });

  test("требует ввод статьи для «О чем статья?»", async ({ page }) => {
    await page.getByRole("button", { name: "О чем статья?" }).click();
    await expect(
      page.getByText("Вставьте ссылку на статью или текст."),
    ).toBeVisible();
  });

  test("требует ввод статьи для «Тезисы»", async ({ page }) => {
    await page.getByRole("button", { name: "Тезисы" }).click();
    await expect(
      page.getByText("Вставьте ссылку на статью или текст."),
    ).toBeVisible();
  });
});
