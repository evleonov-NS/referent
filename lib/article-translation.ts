import { chatCompletion } from "@/lib/openrouter";
import { ARTICLE_TRANSLATION_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  buildArticleUserPrompt,
  truncateArticleContent,
} from "@/lib/article-ai";
import { isInvalidTranslation } from "@/lib/translation";

const MAX_ATTEMPTS = 3;

export async function translateArticleText(
  content: string,
  title?: string,
  date?: string,
): Promise<string> {
  const contentForTranslation = truncateArticleContent(content);
  const userPrompt = buildArticleUserPrompt(
    contentForTranslation,
    title,
    date,
  );

  let translation = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    translation = await chatCompletion([
      { role: "system", content: ARTICLE_TRANSLATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);

    if (!isInvalidTranslation(translation, content.length)) {
      return translation;
    }
  }

  return translation;
}
