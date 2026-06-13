import { NextRequest } from "next/server";

import { apiErrorResponse, handleApiError } from "@/lib/api-error-response";
import { AppErrorCode } from "@/lib/app-errors";
import {
  buildArticleUserPrompt,
  resolveArticleFromRequest,
  truncateArticleContent,
} from "@/lib/article-ai";
import { chatCompletion } from "@/lib/openrouter";
import { ARTICLE_TRANSLATION_SYSTEM_PROMPT } from "@/lib/prompts";
import { isInvalidTranslation } from "@/lib/translation";

const MAX_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const article = await resolveArticleFromRequest(body);

    if (!article.content.trim()) {
      return apiErrorResponse(AppErrorCode.ARTICLE_EMPTY_CONTENT);
    }

    const contentForTranslation = truncateArticleContent(article.content);
    const userPrompt = buildArticleUserPrompt(
      contentForTranslation,
      article.title,
      article.date,
    );

    let translation = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      translation = await chatCompletion([
        { role: "system", content: ARTICLE_TRANSLATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ]);

      if (!isInvalidTranslation(translation, article.content.length)) {
        return Response.json({ translation });
      }
    }

    return apiErrorResponse(AppErrorCode.AI_EMPTY_RESPONSE);
  } catch (error) {
    return handleApiError(error);
  }
}
