export const AppErrorCode = {
  ARTICLE_INPUT_REQUIRED: "ARTICLE_INPUT_REQUIRED",
  ARTICLE_FETCH_FAILED: "ARTICLE_FETCH_FAILED",
  ARTICLE_EMPTY_CONTENT: "ARTICLE_EMPTY_CONTENT",
  LETTER_INPUT_REQUIRED: "LETTER_INPUT_REQUIRED",
  AI_EMPTY_RESPONSE: "AI_EMPTY_RESPONSE",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
  AI_CREDITS_EXHAUSTED: "AI_CREDITS_EXHAUSTED",
  AI_CONFIG_MISSING: "AI_CONFIG_MISSING",
  IMAGE_CONFIG_MISSING: "IMAGE_CONFIG_MISSING",
  IMAGE_GENERATION_FAILED: "IMAGE_GENERATION_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  REQUEST_ABORTED: "REQUEST_ABORTED",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.ARTICLE_INPUT_REQUIRED]:
    "Вставьте ссылку на статью или текст.",
  [AppErrorCode.ARTICLE_FETCH_FAILED]:
    "Не удалось загрузить статью по этой ссылке.",
  [AppErrorCode.ARTICLE_EMPTY_CONTENT]:
    "Не удалось извлечь текст статьи. Попробуйте вставить текст вручную.",
  [AppErrorCode.LETTER_INPUT_REQUIRED]: "Вставьте текст письма.",
  [AppErrorCode.AI_EMPTY_RESPONSE]:
    "Модель не вернула результат. Попробуйте ещё раз.",
  [AppErrorCode.AI_UNAVAILABLE]:
    "Сервис AI временно недоступен. Попробуйте позже.",
  [AppErrorCode.AI_CREDITS_EXHAUSTED]:
    "Недостаточно кредитов на OpenRouter. Пополните баланс или выберите другую модель.",
  [AppErrorCode.AI_CONFIG_MISSING]:
    "API-ключ не настроен. Добавьте OPENROUTER_API_KEY в .env.local.",
  [AppErrorCode.IMAGE_CONFIG_MISSING]:
    "API-ключ Hugging Face не настроен. Добавьте HUGGINGFACE_API_KEY в .env.local.",
  [AppErrorCode.IMAGE_GENERATION_FAILED]:
    "Не удалось сгенерировать иллюстрацию. Попробуйте ещё раз позже.",
  [AppErrorCode.NETWORK_ERROR]:
    "Проблема с сетью. Проверьте подключение и попробуйте снова.",
  [AppErrorCode.REQUEST_ABORTED]: "Операция прервана.",
  [AppErrorCode.INVALID_RESPONSE]: "Сервер вернул некорректный ответ.",
  [AppErrorCode.INTERNAL_ERROR]:
    "Что-то пошло не так. Попробуйте ещё раз позже.",
};

const DEFAULT_HTTP_STATUS: Record<AppErrorCode, number> = {
  [AppErrorCode.ARTICLE_INPUT_REQUIRED]: 400,
  [AppErrorCode.ARTICLE_FETCH_FAILED]: 502,
  [AppErrorCode.ARTICLE_EMPTY_CONTENT]: 400,
  [AppErrorCode.LETTER_INPUT_REQUIRED]: 400,
  [AppErrorCode.AI_EMPTY_RESPONSE]: 502,
  [AppErrorCode.AI_UNAVAILABLE]: 503,
  [AppErrorCode.AI_CREDITS_EXHAUSTED]: 402,
  [AppErrorCode.AI_CONFIG_MISSING]: 500,
  [AppErrorCode.IMAGE_CONFIG_MISSING]: 500,
  [AppErrorCode.IMAGE_GENERATION_FAILED]: 502,
  [AppErrorCode.NETWORK_ERROR]: 503,
  [AppErrorCode.REQUEST_ABORTED]: 499,
  [AppErrorCode.INVALID_RESPONSE]: 502,
  [AppErrorCode.INTERNAL_ERROR]: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly retriable: boolean;

  constructor(
    code: AppErrorCode,
    options?: { httpStatus?: number; retriable?: boolean },
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = options?.httpStatus ?? DEFAULT_HTTP_STATUS[code];
    this.retriable = options?.retriable ?? false;
  }
}

export function getErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code];
}

export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return (
    typeof value === "string" &&
    Object.values(AppErrorCode).includes(value as AppErrorCode)
  );
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    /aborted|timeout/i.test(error.message)
  );
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error instanceof TypeError ||
    /fetch failed|network|ECONNREFUSED|ENOTFOUND/i.test(error.message)
  );
}

export function mapUnknownError(error: unknown): AppErrorCode {
  if (error instanceof AppError) return error.code;

  if (isAbortError(error)) return AppErrorCode.REQUEST_ABORTED;
  if (isNetworkError(error)) return AppErrorCode.NETWORK_ERROR;

  return AppErrorCode.INTERNAL_ERROR;
}

export function httpStatusForCode(code: AppErrorCode): number {
  return DEFAULT_HTTP_STATUS[code];
}
