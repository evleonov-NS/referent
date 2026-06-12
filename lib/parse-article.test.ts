import { describe, expect, it } from "vitest";

import { cleanArticleContent } from "./parse-article";

describe("cleanArticleContent", () => {
  it("removes blog navigation boilerplate", () => {
    const input = `Blog / product
Jun 10, 2026·product
Jason Smale, Yuri Volkov & Michael Zhao · 4 min read

Today we're shipping improvements.

## Run Bugbot before you push

You can now run Bugbot with /review.

Related posts
Apr 8, 2026·Product
Bugbot now self-improves`;

    const result = cleanArticleContent(input);

    expect(result).not.toMatch(/Blog\s*\/\s*product/i);
    expect(result).not.toMatch(/min read/i);
    expect(result).not.toMatch(/Related posts/i);
    expect(result).toContain("Today we're shipping improvements.");
    expect(result).toContain("## Run Bugbot before you push");
    expect(result).toContain("/review");
  });

  it("normalizes excessive blank lines", () => {
    const input = "First paragraph.\n\n\n\n\nSecond paragraph.";
    expect(cleanArticleContent(input)).toBe(
      "First paragraph.\n\nSecond paragraph.",
    );
  });
});
