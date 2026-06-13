import { describe, expect, it } from "vitest";

import {
  AppError,
  AppErrorCode,
  ERROR_MESSAGES,
  getErrorMessage,
  isAppErrorCode,
  mapUnknownError,
} from "./app-errors";

describe("app-errors", () => {
  it("exposes friendly Russian messages for every code", () => {
    for (const code of Object.values(AppErrorCode)) {
      expect(getErrorMessage(code)).toBe(ERROR_MESSAGES[code]);
      expect(getErrorMessage(code).length).toBeGreaterThan(10);
    }
  });

  it("recognizes valid error codes", () => {
    expect(isAppErrorCode(AppErrorCode.ARTICLE_FETCH_FAILED)).toBe(true);
    expect(isAppErrorCode("UNKNOWN")).toBe(false);
  });

  it("maps fetch timeout to article fetch failure in parse layer", () => {
    const timeout = new DOMException("The operation timed out.", "TimeoutError");
    expect(mapUnknownError(timeout)).toBe(AppErrorCode.REQUEST_ABORTED);
  });

  it("preserves AppError code", () => {
    const error = new AppError(AppErrorCode.ARTICLE_FETCH_FAILED);
    expect(mapUnknownError(error)).toBe(AppErrorCode.ARTICLE_FETCH_FAILED);
    expect(error.message).toBe(
      "Не удалось загрузить статью по этой ссылке.",
    );
  });

  it("maps network TypeError", () => {
    expect(mapUnknownError(new TypeError("fetch failed"))).toBe(
      AppErrorCode.NETWORK_ERROR,
    );
  });
});
