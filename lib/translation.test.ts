import { describe, expect, it } from "vitest";

import {
  estimateReplySeconds,
  estimateSummarySeconds,
  estimateThesesSeconds,
  estimateTranslationSeconds,
  isInvalidSummary,
  isInvalidTheses,
  isInvalidTranslation,
} from "./translation";

describe("estimateTranslationSeconds", () => {
  it("scales with content length within bounds", () => {
    expect(estimateTranslationSeconds(100)).toBe(15);
    expect(estimateTranslationSeconds(10_000)).toBe(25);
    expect(estimateTranslationSeconds(100_000)).toBe(120);
  });
});

describe("estimateReplySeconds", () => {
  it("returns slightly higher estimate than translation", () => {
    expect(estimateReplySeconds(900)).toBeGreaterThan(
      estimateTranslationSeconds(900),
    );
  });
});

describe("estimateSummarySeconds", () => {
  it("is faster than full translation", () => {
    expect(estimateSummarySeconds(5000)).toBeLessThan(
      estimateTranslationSeconds(5000),
    );
  });
});

describe("estimateThesesSeconds", () => {
  it("is faster than full translation", () => {
    expect(estimateThesesSeconds(5000)).toBeLessThan(
      estimateTranslationSeconds(5000),
    );
  });
});

describe("isInvalidSummary", () => {
  it("flags empty and safety responses", () => {
    expect(isInvalidSummary("", 1000)).toBe(true);
    expect(isInvalidSummary("User Safety: safe", 1000)).toBe(true);
  });

  it("accepts normal summary", () => {
    const summary =
      "Статья рассказывает о новых возможностях Bugbot: ускорение работы, " +
      "снижение стоимости и улучшение качества поиска ошибок в коде.";

    expect(isInvalidSummary(summary, 1000)).toBe(false);
  });
});

describe("isInvalidTheses", () => {
  it("flags responses without list structure", () => {
    expect(isInvalidTheses("Просто текст без списка", 1000)).toBe(true);
  });

  it("accepts bulleted theses", () => {
    const theses = `- Bugbot стал в 3 раза быстрее
- Стоимость снизилась на 22%
- Находит на 10% больше багов`;

    expect(isInvalidTheses(theses, 1000)).toBe(false);
  });
});

describe("isInvalidTranslation", () => {
  it("flags empty and safety responses", () => {
    expect(isInvalidTranslation("", 1000)).toBe(true);
    expect(isInvalidTranslation("User Safety: safe", 1000)).toBe(true);
  });

  it("accepts normal translation", () => {
    const translation =
      "Это длинный перевод статьи с достаточным количеством текста для проверки. " +
      "Он содержит несколько предложений, чтобы пройти минимальный порог длины.";

    expect(isInvalidTranslation(translation, 1000)).toBe(false);
  });
});
