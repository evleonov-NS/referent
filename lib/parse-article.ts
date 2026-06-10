import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { parseHTML } from "linkedom";

export type ParsedArticle = {
  date: string;
  title: string;
  content: string;
};

const CONTENT_SELECTORS = [
  "article",
  "main",
  '[role="article"]',
  ".post",
  ".content",
  ".article-content",
  ".entry-content",
  ".post-content",
  "#content",
  ".story-body",
];

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractTitle($: cheerio.CheerioAPI): string {
  const candidates = [
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $('meta[name="title"]').attr("content"),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }

  return "";
}

function extractDate($: cheerio.CheerioAPI): string {
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[name="publish_date"]',
    'meta[name="date"]',
    'meta[itemprop="datePublished"]',
  ];

  for (const selector of metaSelectors) {
    const value = $(selector).attr("content")?.trim();
    if (value) return value;
  }

  const timeValue = $("time[datetime]").first().attr("datetime")?.trim();
  if (timeValue) return timeValue;

  const itempropValue = $('[itemprop="datePublished"]').first().text().trim();
  if (itempropValue) return itempropValue;

  return "";
}

function extractContentFromSelectors($: cheerio.CheerioAPI): string {
  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first().clone();

    if (!element.length) continue;

    element
      .find("script, style, nav, footer, aside, .ad, .advertisement")
      .remove();

    const text = cleanText(element.text());
    if (text.length > 100) return text;
  }

  return "";
}

function extractContentWithReadability(html: string, url: string): string {
  try {
    const { document } = parseHTML(html);

    if (document.location) {
      document.location.href = url;
    }

    const article = new Readability(document, { charThreshold: 100 }).parse();
    return article?.textContent ? cleanText(article.textContent) : "";
  } catch {
    return "";
  }
}

function extractContentFallback($: cheerio.CheerioAPI): string {
  const body = $("body").clone();
  body.find("script, style, nav, header, footer, aside").remove();
  return cleanText(body.text()).slice(0, 5000);
}

function extractContent($: cheerio.CheerioAPI, html: string, url: string): string {
  return (
    extractContentFromSelectors($) ||
    extractContentWithReadability(html, url) ||
    extractContentFallback($)
  );
}

export function parseArticleFromText(text: string): ParsedArticle {
  return {
    date: "",
    title: "",
    content: text.trim(),
  };
}

export async function fetchAndParseArticle(rawUrl: string): Promise<ParsedArticle> {
  const url = normalizeUrl(rawUrl);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ReferentBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  return {
    date: extractDate($),
    title: extractTitle($),
    content: extractContent($, html, url),
  };
}
