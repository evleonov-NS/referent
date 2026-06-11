export function estimateTranslationSeconds(charCount: number): number {
  return Math.min(120, Math.max(15, Math.ceil(charCount / 400)));
}

export function estimateReplySeconds(charCount: number): number {
  return Math.min(120, Math.max(20, Math.ceil(charCount / 300)));
}

export function isInvalidTranslation(
  translation: string,
  sourceLength: number,
): boolean {
  const trimmed = translation.trim();

  if (!trimmed) return true;
  if (/^user safety:/i.test(trimmed)) return true;
  if (trimmed.length < 80 && sourceLength > 400) return true;

  return false;
}
