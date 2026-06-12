import { getArticleFromInput } from "@/lib/get-article";

export const MAX_ARTICLE_CONTENT_LENGTH = 12000;

export type ArticleInput = {
  date: string;
  title: string;
  content: string;
};

export function truncateArticleContent(content: string): string {
  if (content.length <= MAX_ARTICLE_CONTENT_LENGTH) return content;
  return `${content.slice(0, MAX_ARTICLE_CONTENT_LENGTH)}\n\n[Текст обрезан]`;
}

export function buildArticleUserPrompt(
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

export async function resolveArticleFromRequest(body: {
  url?: string;
  text?: string;
  title?: string;
  date?: string;
}): Promise<ArticleInput> {
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";

  if (text) {
    return { date, title, content: text };
  }

  return getArticleFromInput(url || undefined, undefined);
}
