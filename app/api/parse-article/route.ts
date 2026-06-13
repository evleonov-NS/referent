import { NextRequest } from "next/server";

import { apiErrorResponse, handleApiError } from "@/lib/api-error-response";
import { AppErrorCode } from "@/lib/app-errors";
import {
  fetchAndParseArticle,
  parseArticleFromText,
} from "@/lib/parse-article";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (url) {
      const parsed = await fetchAndParseArticle(url);
      return Response.json(parsed);
    }

    if (text) {
      return Response.json(parseArticleFromText(text));
    }

    return apiErrorResponse(AppErrorCode.ARTICLE_INPUT_REQUIRED);
  } catch (error) {
    return handleApiError(error);
  }
}
