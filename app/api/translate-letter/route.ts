import { NextRequest } from "next/server";

export { maxDuration } from "@/lib/api-route-config";

import { apiErrorResponse, handleApiError } from "@/lib/api-error-response";
import { AppErrorCode } from "@/lib/app-errors";
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
      return apiErrorResponse(AppErrorCode.LETTER_INPUT_REQUIRED);
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
        return Response.json({ translation });
      }
    }

    return apiErrorResponse(AppErrorCode.AI_EMPTY_RESPONSE);
  } catch (error) {
    return handleApiError(error);
  }
}
