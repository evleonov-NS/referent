import { NextRequest, NextResponse } from "next/server";

import { getArticleFromInput } from "@/lib/get-article";
import { chatCompletion } from "@/lib/openrouter";
import { ARTICLE_TRANSLATION_SYSTEM_PROMPT } from "@/lib/prompts";
import { isInvalidTranslation } from "@/lib/translation";

const MAX_CONTENT_LENGTH = 12000;

function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) return content;
  return `${content.slice(0, MAX_CONTENT_LENGTH)}\n\n[Текст обрезан для перевода]`;
}

function buildTranslationPrompt(
  content: string,
  title?: string,
  date?: string,
): string {
  return [
    title ? `Заголовок: ${title}` : "",
    date ? `Дата: ${date}` : "",
    "",
    "Текст статьи:",
    content,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const date = typeof body.date === "string" ? body.date.trim() : "";

    const article = text
      ? { date, title, content: text }
      : await getArticleFromInput(url || undefined, undefined);

    if (!article.content.trim()) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст статьи" },
        { status: 400 },
      );
    }

    const contentForTranslation = truncateContent(article.content);

    const translation = await chatCompletion([
      {
        role: "system",
        content: ARTICLE_TRANSLATION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildTranslationPrompt(
          contentForTranslation,
          article.title,
          article.date,
        ),
      },
    ]);

    if (isInvalidTranslation(translation, article.content.length)) {
      return NextResponse.json(
        {
          error:
            "Модель не вернула перевод. Попробуйте ещё раз или выберите другую модель в OPENROUTER_MODEL.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ translation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка перевода статьи";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
