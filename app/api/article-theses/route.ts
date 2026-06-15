import { NextRequest } from "next/server";

export { maxDuration } from "@/lib/api-route-config";

import { apiErrorResponse, handleApiError } from "@/lib/api-error-response";
import { AppErrorCode } from "@/lib/app-errors";
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
      return apiErrorResponse(AppErrorCode.ARTICLE_EMPTY_CONTENT);
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
        return Response.json({ theses });
      }
    }

    return apiErrorResponse(AppErrorCode.AI_EMPTY_RESPONSE);
  } catch (error) {
    return handleApiError(error);
  }
}
