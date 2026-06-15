import { NextRequest } from "next/server";

import { apiErrorResponse, handleApiError } from "@/lib/api-error-response";
import { AppErrorCode } from "@/lib/app-errors";
import {
  buildArticleUserPrompt,
  resolveArticleFromRequest,
  truncateArticleContent,
} from "@/lib/article-ai";
import { translateArticleText } from "@/lib/article-translation";
import { generateIllustration } from "@/lib/huggingface";
import { chatCompletion } from "@/lib/openrouter";
import { ARTICLE_ILLUSTRATION_PROMPT_SYSTEM } from "@/lib/prompts";
import {
  isInvalidImagePrompt,
  isInvalidTranslation,
} from "@/lib/translation";

const MAX_PROMPT_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const article = await resolveArticleFromRequest(body);

    if (!article.content.trim()) {
      return apiErrorResponse(AppErrorCode.ARTICLE_EMPTY_CONTENT);
    }

    const contentForPrompt = truncateArticleContent(article.content);
    const userPrompt = buildArticleUserPrompt(
      contentForPrompt,
      article.title,
      article.date,
    );

    let imagePrompt = "";

    for (let attempt = 1; attempt <= MAX_PROMPT_ATTEMPTS; attempt++) {
      imagePrompt = await chatCompletion([
        { role: "system", content: ARTICLE_ILLUSTRATION_PROMPT_SYSTEM },
        { role: "user", content: userPrompt },
      ]);

      if (!isInvalidImagePrompt(imagePrompt)) {
        break;
      }
    }

    if (isInvalidImagePrompt(imagePrompt)) {
      return apiErrorResponse(AppErrorCode.AI_EMPTY_RESPONSE);
    }

    const [translation, image] = await Promise.all([
      translateArticleText(article.content, article.title, article.date),
      generateIllustration(imagePrompt.trim()),
    ]);

    if (isInvalidTranslation(translation, article.content.length)) {
      return apiErrorResponse(AppErrorCode.AI_EMPTY_RESPONSE);
    }

    return Response.json({ translation, image });
  } catch (error) {
    return handleApiError(error);
  }
}
