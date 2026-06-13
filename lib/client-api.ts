import {
  AppErrorCode,
  getErrorMessage,
  isAppErrorCode,
  mapUnknownError,
} from "@/lib/app-errors";

export class ApiClientError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode) {
    super(getErrorMessage(code));
    this.name = "ApiClientError";
    this.code = code;
  }
}

function mapHttpStatusToCode(status: number): AppErrorCode {
  if (status === 402) return AppErrorCode.AI_CREDITS_EXHAUSTED;
  if (status === 502) return AppErrorCode.AI_EMPTY_RESPONSE;
  if (status === 503) return AppErrorCode.AI_UNAVAILABLE;

  return AppErrorCode.INTERNAL_ERROR;
}

export async function fetchApi<T>(
  endpoint: string,
  payload: object,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof Event) {
      throw new ApiClientError(AppErrorCode.REQUEST_ABORTED);
    }

    throw new ApiClientError(mapUnknownError(error));
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new ApiClientError(AppErrorCode.INVALID_RESPONSE);
  }

  const data = (await response.json()) as { code?: unknown };

  if (!response.ok) {
    const code = isAppErrorCode(data.code)
      ? data.code
      : mapHttpStatusToCode(response.status);

    throw new ApiClientError(code);
  }

  return data as T;
}

export function resolveClientError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Event) {
    return getErrorMessage(AppErrorCode.REQUEST_ABORTED);
  }

  return getErrorMessage(mapUnknownError(error));
}
