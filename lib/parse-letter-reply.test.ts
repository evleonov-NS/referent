import { describe, expect, it } from "vitest";

import { isValidLetterReply, parseLetterReply } from "./parse-letter-reply";

describe("parseLetterReply", () => {
  it("parses standard section headers", () => {
    const content = `## Ответ на языке оригинала

Hi John, thanks for your email.

## Ответ на русском языке

Привет, Джон, спасибо за письмо.`;

    const parsed = parseLetterReply(content);

    expect(parsed.replyOriginal).toContain("Hi John");
    expect(parsed.replyRussian).toContain("Привет, Джон");
  });

  it("parses glued header variants from free models", () => {
    const content = `## Ответ наязыке оригинала

Hello there, I will review Hoverify soon.

## Ответ на русском языке

Здравствуйте, я скоро оставлю отзыв о Hoverify.`;

    const parsed = parseLetterReply(content);

    expect(parsed.replyOriginal).toContain("Hello there");
    expect(parsed.replyRussian).toContain("Здравствуйте");
  });
});

describe("isValidLetterReply", () => {
  it("rejects user safety placeholder", () => {
    expect(
      isValidLetterReply(
        {
          replyOriginal: "User Safety: safe",
          replyRussian: "User Safety: safe",
        },
        500,
      ),
    ).toBe(false);
  });

  it("accepts valid bilingual reply", () => {
    expect(
      isValidLetterReply(
        {
          replyOriginal: "Thanks for the update and the walkthrough video.",
          replyRussian:
            "Спасибо за обновление и видеообзор, обязательно посмотрю.",
        },
        500,
      ),
    ).toBe(true);
  });
});
