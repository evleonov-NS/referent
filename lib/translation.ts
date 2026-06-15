export function estimateTranslationSeconds(charCount: number): number {
  return Math.min(120, Math.max(15, Math.ceil(charCount / 400)));
}

export function estimateSummarySeconds(charCount: number): number {
  return Math.min(60, Math.max(10, Math.ceil(charCount / 600)));
}

export function estimateThesesSeconds(charCount: number): number {
  return Math.min(90, Math.max(12, Math.ceil(charCount / 500)));
}

export function estimateReplySeconds(charCount: number): number {
  return Math.min(120, Math.max(20, Math.ceil(charCount / 300)));
}

export function estimateIllustrationSeconds(charCount: number): number {
  return Math.min(240, estimateTranslationSeconds(charCount) + 90);
}

function isGarbageAiText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^user safety:/i.test(trimmed)) return true;
  return false;
}

export function isInvalidTranslation(
  translation: string,
  sourceLength: number,
): boolean {
  if (isGarbageAiText(translation)) return true;
  if (translation.trim().length < 80 && sourceLength > 400) return true;
  return false;
}

export function isInvalidSummary(
  summary: string,
  sourceLength: number,
): boolean {
  if (isGarbageAiText(summary)) return true;
  if (summary.trim().length < 40 && sourceLength > 400) return true;
  return false;
}

export function isInvalidTheses(theses: string, sourceLength: number): boolean {
  if (isGarbageAiText(theses)) return true;

  const listItemPattern = /^(?:[-•*]|\d+[.)])\s/;

  const listItems = theses
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => listItemPattern.test(line));

  if (listItems.length < 2 && sourceLength > 200) return true;
  if (theses.trim().length < 30 && sourceLength > 400) return true;

  return false;
}

export function isInvalidImagePrompt(prompt: string): boolean {
  if (isGarbageAiText(prompt)) return true;

  const trimmed = prompt.trim();
  if (trimmed.length < 15) return true;
  if (trimmed.length > 800) return true;
  if (/^#{1,6}\s|```|\[.*\]\(.*\)/.test(trimmed)) return true;

  return false;
}
