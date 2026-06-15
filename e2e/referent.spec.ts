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
    await expect(page.getByRole("button", { name: "Иллюстрация" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Перевести письмо" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Подготовить ответ" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Очистить" })).toBeVisible();
  });

  test("очищает поля, результаты и ошибки", async ({ page }) => {
    await page.getByRole("button", { name: "О чем статья?" }).click();
    await expect(
      page.getByText("Вставьте ссылку на статью или текст."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Перевести письмо" }).click();
    await expect(page.getByText("Вставьте текст письма.")).toBeVisible();

    await page.getByLabel("Статья").fill("Текст статьи");
    await page.getByLabel("Текст письма").fill("Hello");

    await page.getByRole("button", { name: "Очистить" }).click();

    await expect(page.getByLabel("Статья")).toHaveValue("");
    await expect(page.getByLabel("Текст письма")).toHaveValue("");
    await expect(
      page.getByText("Вставьте ссылку на статью или текст."),
    ).not.toBeVisible();
    await expect(page.getByText("Вставьте текст письма.")).not.toBeVisible();
    await expect(page.getByLabel("Результат")).toHaveValue("");
    await expect(page.getByLabel("Перевод")).toHaveValue("");
  });

  test("требует текст письма для перевода", async ({ page }) => {
    await page.getByRole("button", { name: "Перевести письмо" }).click();
    await expect(
      page.getByRole("alert").getByText("Вставьте текст письма."),
    ).toBeVisible();
  });

  test("требует текст письма для подготовки ответа", async ({ page }) => {
    await page.getByRole("button", { name: "Подготовить ответ" }).click();
    await expect(
      page.getByRole("alert").getByText("Вставьте текст письма."),
    ).toBeVisible();
  });

  test("требует ввод статьи для подробного перевода", async ({ page }) => {
    await page.getByRole("button", { name: "Подробный перевод" }).click();
    await expect(
      page.getByRole("alert").getByText("Вставьте ссылку на статью или текст."),
    ).toBeVisible();
  });

  test("требует ввод статьи для «О чем статья?»", async ({ page }) => {
    await page.getByRole("button", { name: "О чем статья?" }).click();
    await expect(
      page.getByRole("alert").getByText("Вставьте ссылку на статью или текст."),
    ).toBeVisible();
  });

  test("требует ввод статьи для «Тезисы»", async ({ page }) => {
    await page.getByRole("button", { name: "Тезисы" }).click();
    await expect(
      page.getByRole("alert").getByText("Вставьте ссылку на статью или текст."),
    ).toBeVisible();
  });
});

async function expectNoHorizontalScroll(page: import("@playwright/test").Page) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Адаптивность", () => {
  test("мобильный: кнопки в столбик, без горизонтальной прокрутки", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "О чем статья?" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);

    const articleButtons = page.locator('[data-testid="article-actions"]');
    await expect(articleButtons).toHaveCSS("flex-direction", "column");
  });

  test("планшет и десктоп: кнопки в строку", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const articleButtons = page.locator('[data-testid="article-actions"]');
    await expect(articleButtons).toHaveCSS("flex-direction", "row");

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(articleButtons).toHaveCSS("flex-direction", "row");
    await expectNoHorizontalScroll(page);
  });
});
