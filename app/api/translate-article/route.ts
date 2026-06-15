import { NextRequest } from "next/server";

import { apiErrorResponse, handleApiError } from "@/lib/api-error-response";
import { AppErrorCode } from "@/lib/app-errors";
import { resolveArticleFromRequest } from "@/lib/article-ai";
import { translateArticleText } from "@/lib/article-translation";
import { isInvalidTranslation } from "@/lib/translation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const article = await resolveArticleFromRequest(body);

    if (!article.content.trim()) {
      return apiErrorResponse(AppErrorCode.ARTICLE_EMPTY_CONTENT);
    }

    const translation = await translateArticleText(
      article.content,
      article.title,
      article.date,
    );

    if (isInvalidTranslation(translation, article.content.length)) {
      return apiErrorResponse(AppErrorCode.AI_EMPTY_RESPONSE);
    }

    return Response.json({ translation });
  } catch (error) {
    return handleApiError(error);
  }
}
