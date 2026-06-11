import { NextRequest, NextResponse } from "next/server";

import { chatCompletion } from "@/lib/openrouter";
import {
  isValidLetterReply,
  parseLetterReply,
} from "@/lib/parse-letter-reply";
import { LETTER_REPLY_SYSTEM_PROMPT } from "@/lib/prompts";

const MAX_LETTER_LENGTH = 8000;
const MAX_REPLY_ATTEMPTS = 3;

const LETTER_REPLY_REFORMAT_PROMPT = `Приведи текст к строгому формату:

## Ответ на языке оригинала

[текст ответа на языке исходного письма]

## Ответ на русском языке

[текст ответа на русском языке]

Требования:
* Не меняй факты, намерения, обещания, даты, сроки, цифры, имена и договорённости.
* Русская и английская версии должны остаться семантически эквивалентны.
* Верни только два раздела без пояснений и служебных комментариев.`;

function truncateLetter(text: string): string {
  if (text.length <= MAX_LETTER_LENGTH) return text;
  return `${text.slice(0, MAX_LETTER_LENGTH)}\n\n[Текст обрезан]`;
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
    let parsed = { replyOriginal: "", replyRussian: "" };

    for (let attempt = 1; attempt <= MAX_REPLY_ATTEMPTS; attempt++) {
      const rawReply = await chatCompletion([
        {
          role: "system",
          content: LETTER_REPLY_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Исходное письмо:\n\n${letterText}`,
        },
      ]);

      parsed = parseLetterReply(rawReply);

      if (!isValidLetterReply(parsed, text.length)) {
        const reformatted = await chatCompletion([
          {
            role: "system",
            content: LETTER_REPLY_REFORMAT_PROMPT,
          },
          {
            role: "user",
            content: rawReply,
          },
        ]);

        parsed = parseLetterReply(reformatted);
      }

      if (isValidLetterReply(parsed, text.length)) {
        return NextResponse.json(parsed);
      }
    }

    if (!isValidLetterReply(parsed, text.length)) {
      return NextResponse.json(
        {
          error:
            "Модель не вернула ответ в нужном формате. Попробуйте ещё раз или выберите другую модель в OPENROUTER_MODEL.",
        },
        { status: 502 },
      );
    }

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка подготовки ответа";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
