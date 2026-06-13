import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { parseHTML } from "linkedom";

import { AppError, AppErrorCode } from "@/lib/app-errors";

export type ParsedArticle = {
  date: string;
  title: string;
  content: string;
};

const CONTENT_SELECTORS = [
  "article",
  "main article",
  '[role="article"]',
  "main",
  ".post",
  ".content",
  ".article-content",
  ".entry-content",
  ".post-content",
  "#content",
  ".story-body",
  ".prose",
];

const BOILERPLATE_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "aside",
  "header",
  ".ad",
  ".advertisement",
  '[class*="toc"]',
  '[class*="table-of-contents"]',
  '[class*="related"]',
  '[class*="breadcrumb"]',
  '[class*="newsletter"]',
  '[class*="share"]',
  '[class*="sidebar"]',
  '[aria-label*="Table of Contents" i]',
];

const BOILERPLATE_TEXT_PATTERNS: RegExp[] = [
  /^Blog\s*\/\s*\w+\s*/i,
  /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s*[·•]\s*\w+\s*/i,
  /^[A-Z][\w\s,.&'-]+(?:\s*&\s*[A-Z][\w\s,.&'-]+)*\s*·\s*\d+\s*min\s+read\s*/i,
  /^#{0,2}\s*Table of Contents\s*↑?\s*/im,
  /^↑\s*$/gm,
  /^Filed under:\s*.+$/im,
  /^Authors:\s*.+$/im,
  /^Skip to content\s*/i,
  /^Sign in\s*Contact\s*Contact sales\s*Download\s*/i,
  /^Related posts[\s\S]*$/im,
  /^View more posts[\s\S]*$/im,
  /^©\s*\d{4}[\s\S]*$/im,
];

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function cleanInlineText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeArticleText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanArticleContent(text: string): string {
  let result = normalizeArticleText(text);

  for (const pattern of BOILERPLATE_TEXT_PATTERNS) {
    result = result.replace(pattern, "");
  }

  const lines = result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(Sign in|Contact sales|Download|Product|Resources|Company|Legal|Connect)$/i.test(line)) {
        return false;
      }
      if (/^SOC 2 Certified$/i.test(line)) return false;
      return true;
    });

  return normalizeArticleText(lines.join("\n\n"));
}

function extractBlocksFromElement(
  $: cheerio.CheerioAPI,
  rootSelector: string,
): string {
  const element = $(rootSelector).first().clone();
  if (!element.length) return "";

  for (const selector of BOILERPLATE_SELECTORS) {
    element.find(selector).remove();
  }

  const blocks: string[] = [];

  element.find("h1,h2,h3,h4,h5,h6,p,li,blockquote").each((_, el) => {
    const $el = $(el);
    const text = cleanInlineText($el.text());
    if (!text || text.length < 2) return;

    const tag = el.tagName?.toLowerCase() ?? "";
    if (/^h[1-6]$/.test(tag)) {
      const headingText = text.replace(/^#+\s*/, "");
      const level = Number(tag[1]);
      const prefix = "#".repeat(level);
      blocks.push(`${prefix} ${headingText}`);
      return;
    }

    blocks.push(text);
  });

  if (blocks.length > 0) {
    return blocks.join("\n\n");
  }

  return normalizeArticleText(element.text());
}

function extractTitle($: cheerio.CheerioAPI): string {
  const candidates = [
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $('meta[name="title"]').attr("content"),
    $("article h1").first().text(),
    $("main h1").first().text(),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return cleanInlineText(value);
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
    const text = extractBlocksFromElement($, selector);
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
    return article?.textContent
      ? normalizeArticleText(article.textContent)
      : "";
  } catch {
    return "";
  }
}

function extractContentFallback($: cheerio.CheerioAPI): string {
  const text = extractBlocksFromElement($, "body");
  return text.slice(0, 5000);
}

function extractContent($: cheerio.CheerioAPI, html: string, url: string): string {
  const raw =
    extractContentFromSelectors($) ||
    extractContentWithReadability(html, url) ||
    extractContentFallback($);

  return cleanArticleContent(raw);
}

export function parseArticleFromText(text: string): ParsedArticle {
  return {
    date: "",
    title: "",
    content: cleanArticleContent(text.trim()),
  };
}

export async function fetchAndParseArticle(rawUrl: string): Promise<ParsedArticle> {
  const url = normalizeUrl(rawUrl);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ReferentBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new AppError(AppErrorCode.ARTICLE_FETCH_FAILED);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    return {
      date: extractDate($),
      title: extractTitle($),
      content: extractContent($, html, url),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(AppErrorCode.ARTICLE_FETCH_FAILED);
  }
}
