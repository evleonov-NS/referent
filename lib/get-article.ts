import {
  fetchAndParseArticle,
  parseArticleFromText,
  type ParsedArticle,
} from "@/lib/parse-article";

export async function getArticleFromInput(
  url?: string,
  text?: string,
): Promise<ParsedArticle> {
  if (url) {
    return fetchAndParseArticle(url);
  }

  if (text) {
    return parseArticleFromText(text);
  }

  throw new Error("Укажите url или text");
}
