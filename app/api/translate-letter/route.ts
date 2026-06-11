import { NextRequest, NextResponse } from "next/server";

import { chatCompletion } from "@/lib/openrouter";
import { LETTER_TRANSLATION_SYSTEM_PROMPT } from "@/lib/prompts";
import { isInvalidTranslation } from "@/lib/translation";

const MAX_LETTER_LENGTH = 8000;

function truncateLetter(text: string): string {
  if (text.length <= MAX_LETTER_LENGTH) return text;
  return `${text.slice(0, MAX_LETTER_LENGTH)}\n\n[Текст обрезан для перевода]`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Вставьте текст письма" },
        { status: 400 },
      );
    }

    const letterText = truncateLetter(text);
    let translation = "";

    for (let attempt = 1; attempt <= 3; attempt++) {
      translation = await chatCompletion([
        {
          role: "system",
          content: LETTER_TRANSLATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Письмо:\n\n${letterText}`,
        },
      ]);

      if (!isInvalidTranslation(translation, text.length)) {
        return NextResponse.json({ translation });
      }
    }

    if (isInvalidTranslation(translation, text.length)) {
      return NextResponse.json(
        {
          error:
            "Модель не вернула перевод письма. Попробуйте ещё раз или выберите другую модель в OPENROUTER_MODEL.",
        },
        { status: 502 },
      );
    }

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка перевода письма";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
