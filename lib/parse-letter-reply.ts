export type ParsedLetterReply = {
  replyOriginal: string;
  replyRussian: string;
};

const ORIGINAL_SECTION_MARKERS = [
  "ответ на языке оригинала",
  "reply in the original language",
  "reply in original language",
  "response in the original language",
  "response in original language",
  "answer in the original language",
  "answer in original language",
];

const RUSSIAN_SECTION_MARKERS = [
  "ответ на русском языке",
  "ответ на русском",
  "reply in russian",
  "russian version",
  "russian reply",
  "russian response",
];

function stripModelArtifacts(content: string): string {
  let text = content.trim();
  text = text.replace(/[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^```(?:markdown|text)?\s*\n?/i, "");
  text = text.replace(/\n?```\s*$/i, "");
  return text.trim();
}

function normalizeSectionHeaders(content: string): string {
  return content
    .replace(/языкеоригинала/gi, "языке оригинала")
    .replace(/наязыке/gi, "на языке")
    .replace(/ответ\s*на\s*языке\s*оригинала/gi, "## Ответ на языке оригинала")
    .replace(/ответ\s*на\s*русском\s*языке/gi, "## Ответ на русском языке");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSectionPattern(markers: string[]): RegExp {
  const joined = markers.map(escapeRegExp).join("|");
  return new RegExp(
    `(?:^|\\n)\\s*(?:#{1,3}\\s*|\\*\\*)?(?:${joined})(?:\\*\\*)?\\s*(?:\\n+|\\s{2,})`,
    "i",
  );
}

const ORIGINAL_SECTION_PATTERN = buildSectionPattern(ORIGINAL_SECTION_MARKERS);
const RUSSIAN_SECTION_PATTERN = buildSectionPattern(RUSSIAN_SECTION_MARKERS);

function extractSection(
  content: string,
  startPattern: RegExp,
  endPattern?: RegExp,
): string {
  const startMatch = content.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return "";

  const sectionStart = startMatch.index + startMatch[0].length;
  const tail = content.slice(sectionStart);

  if (!endPattern) {
    return tail.trim();
  }

  const endMatch = tail.match(endPattern);
  if (!endMatch || endMatch.index === undefined) {
    return tail.trim();
  }

  return tail.slice(0, endMatch.index).trim();
}

export function parseLetterReply(content: string): ParsedLetterReply {
  const normalized = normalizeSectionHeaders(stripModelArtifacts(content));

  const replyOriginal = extractSection(
    normalized,
    ORIGINAL_SECTION_PATTERN,
    RUSSIAN_SECTION_PATTERN,
  );
  const replyRussian = extractSection(normalized, RUSSIAN_SECTION_PATTERN);

  if (replyOriginal && replyRussian) {
    return { replyOriginal, replyRussian };
  }

  const originalMatch = normalized.match(
    /##\s*Ответ на языке оригинала\s*(?:\n+|\s{2,})([\s\S]*?)(?=##\s*Ответ на русском языке\s*(?:\n+|\s{2,})|$)/i,
  );
  const russianMatch = normalized.match(
    /##\s*Ответ на русском языке\s*(?:\n+|\s{2,})([\s\S]*?)$/i,
  );

  return {
    replyOriginal: originalMatch?.[1]?.trim() ?? replyOriginal,
    replyRussian: russianMatch?.[1]?.trim() ?? replyRussian,
  };
}

export function isValidLetterReply(
  reply: ParsedLetterReply,
  sourceLength: number,
): boolean {
  if (!reply.replyOriginal.trim() || !reply.replyRussian.trim()) {
    return false;
  }

  if (/^user safety:/i.test(reply.replyOriginal)) return false;
  if (/^user safety:/i.test(reply.replyRussian)) return false;

  const minLength = sourceLength > 200 ? 20 : 5;
  if (
    reply.replyOriginal.length < minLength ||
    reply.replyRussian.length < minLength
  ) {
    return false;
  }

  return true;
}
