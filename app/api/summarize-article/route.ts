import { NextRequest, NextResponse } from "next/server";

import {
  buildArticleUserPrompt,
  resolveArticleFromRequest,
  truncateArticleContent,
} from "@/lib/article-ai";
import { chatCompletion } from "@/lib/openrouter";
import { ARTICLE_SUMMARY_SYSTEM_PROMPT } from "@/lib/prompts";
import { isInvalidSummary } from "@/lib/translation";

const MAX_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const article = await resolveArticleFromRequest(body);

    if (!article.content.trim()) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст статьи" },
        { status: 400 },
      );
    }

    const contentForAnalysis = truncateArticleContent(article.content);
    const userPrompt = buildArticleUserPrompt(
      contentForAnalysis,
      article.title,
      article.date,
    );

    let summary = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      summary = await chatCompletion([
        { role: "system", content: ARTICLE_SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ]);

      if (!isInvalidSummary(summary, article.content.length)) {
        return NextResponse.json({ summary });
      }
    }

    return NextResponse.json(
      {
        error:
          "Модель не вернула описание статьи. Попробуйте ещё раз или выберите другую модель в OPENROUTER_MODEL.",
      },
      { status: 502 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка анализа статьи";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
