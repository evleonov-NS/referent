import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json(parsed);
    }

    if (text) {
      return NextResponse.json(parseArticleFromText(text));
    }

    return NextResponse.json(
      { error: "Укажите url или text" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка парсинга статьи";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
