import { NextResponse } from "next/server";

import {
  AppError,
  type AppErrorCode,
  httpStatusForCode,
  mapUnknownError,
} from "@/lib/app-errors";

export function apiErrorResponse(
  code: AppErrorCode,
  httpStatus?: number,
): NextResponse {
  return NextResponse.json(
    { code },
    { status: httpStatus ?? httpStatusForCode(code) },
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return apiErrorResponse(error.code, error.httpStatus);
  }

  const code = mapUnknownError(error);
  return apiErrorResponse(code);
}
