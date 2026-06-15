import { AppError, AppErrorCode } from "@/lib/app-errors";
import { httpsPost } from "@/lib/http-ipv4";

const HF_ROUTER_BASE = "https://router.huggingface.co";
const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";
const DEFAULT_PROVIDER = "hf-inference";
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;
const REQUEST_TIMEOUT_MS = 180_000;

function getModelId(): string {
  return process.env.HUGGINGFACE_MODEL?.trim() || DEFAULT_MODEL;
}

function getProvider(): string {
  return process.env.HUGGINGFACE_PROVIDER?.trim() || DEFAULT_PROVIDER;
}

function buildEndpoint(modelId: string): string {
  const provider = getProvider();
  return `${HF_ROUTER_BASE}/${provider}/models/${modelId}`;
}

function isModelLoading(status: number, body: string): boolean {
  return (
    status === 503 &&
    /loading|currently loading|model is loading/i.test(body)
  );
}

function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}

function parseErrorBody(body: string): string {
  try {
    const json = JSON.parse(body) as { error?: string };
    return json.error ?? body;
  } catch {
    return body;
  }
}

function mapHttpError(status: number, body: string): AppError {
  if (isAuthError(status)) {
    return new AppError(AppErrorCode.IMAGE_GENERATION_FAILED, {
      httpStatus: status,
    });
  }

  if (/deprecated|no longer supported/i.test(body)) {
    return new AppError(AppErrorCode.IMAGE_GENERATION_FAILED, {
      httpStatus: status,
    });
  }

  return new AppError(AppErrorCode.IMAGE_GENERATION_FAILED, {
    httpStatus: status,
    retriable: isModelLoading(status, body) || status === 429,
  });
}

function mapTransportError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error && /CONNECT_TIMEOUT|ETIMEDOUT/i.test(error.message)) {
    return new AppError(AppErrorCode.IMAGE_GENERATION_FAILED, { retriable: true });
  }

  return new AppError(AppErrorCode.IMAGE_GENERATION_FAILED);
}

export async function generateIllustration(prompt: string): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();

  if (!apiKey) {
    throw new AppError(AppErrorCode.IMAGE_CONFIG_MISSING);
  }

  const endpoint = buildEndpoint(getModelId());
  const payload = JSON.stringify({
    inputs: prompt,
    parameters: {
      num_inference_steps: 4,
    },
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Awaited<ReturnType<typeof httpsPost>>;

    try {
      response = await httpsPost(
        endpoint,
        {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        payload,
        REQUEST_TIMEOUT_MS,
      );
    } catch (error) {
      throw mapTransportError(error);
    }

    const contentTypeHeader = response.headers["content-type"];
    const contentType = Array.isArray(contentTypeHeader)
      ? contentTypeHeader[0]
      : contentTypeHeader ?? "";

    if (response.status >= 200 && response.status < 300 && contentType.startsWith("image/")) {
      return `data:${contentType};base64,${response.body.toString("base64")}`;
    }

    const errorBody = parseErrorBody(response.body.toString("utf8"));
    const mappedError = mapHttpError(response.status, errorBody);

    if (mappedError.retriable && attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }

    throw mappedError;
  }

  throw new AppError(AppErrorCode.IMAGE_GENERATION_FAILED);
}
