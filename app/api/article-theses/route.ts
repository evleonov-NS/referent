import { NextRequest, NextResponse } from "next/server";

import {
  buildArticleUserPrompt,
  resolveArticleFromRequest,
  truncateArticleContent,
} from "@/lib/article-ai";
import { chatCompletion } from "@/lib/openrouter";
import { ARTICLE_THESES_SYSTEM_PROMPT } from "@/lib/prompts";
import { isInvalidTheses } from "@/lib/translation";

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

    let theses = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      theses = await chatCompletion([
        { role: "system", content: ARTICLE_THESES_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ]);

      if (!isInvalidTheses(theses, article.content.length)) {
        return NextResponse.json({ theses });
      }
    }

    return NextResponse.json(
      {
        error:
          "Модель не вернула тезисы статьи. Попробуйте ещё раз или выберите другую модель в OPENROUTER_MODEL.",
      },
      { status: 502 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка выделения тезисов";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
