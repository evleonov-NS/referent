import { describe, expect, it } from "vitest";

import {
  ARTICLE_SUMMARY_SYSTEM_PROMPT,
  ARTICLE_THESES_SYSTEM_PROMPT,
} from "./prompts";

describe("article analysis prompts", () => {
  it("defines summary prompt with key requirements", () => {
    expect(ARTICLE_SUMMARY_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(ARTICLE_SUMMARY_SYSTEM_PROMPT).toMatch(/3–5 связных предложений/i);
    expect(ARTICLE_SUMMARY_SYSTEM_PROMPT).toMatch(/только на русском/i);
  });

  it("defines theses prompt with list format", () => {
    expect(ARTICLE_THESES_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(ARTICLE_THESES_SYSTEM_PROMPT).toMatch(/маркированный список/i);
    expect(ARTICLE_THESES_SYSTEM_PROMPT).toMatch(/от 5 до 10/i);
  });
});
