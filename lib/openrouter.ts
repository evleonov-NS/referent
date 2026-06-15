import { AppError, AppErrorCode, getErrorText } from "@/lib/app-errors";
import { httpsPost } from "@/lib/http-ipv4";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_FREE_MODELS = ["openrouter/free"] as const;

const MAX_ATTEMPTS_PER_MODEL = 3;

export const PAID_DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3-0324";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getModelCandidates(): string[] {
  if (process.env.OPENROUTER_MODEL?.trim()) {
    return [process.env.OPENROUTER_MODEL.trim()];
  }

  return [...DEFAULT_FREE_MODELS];
}

function parseErrorMessage(errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string };
    };
    return parsed.error?.message ?? errorText;
  } catch {
    return errorText;
  }
}

function isRetriableModelError(status: number, message: string): boolean {
  if (status === 402 || status === 404 || status === 429) return true;

  return /unavailable for free|insufficient credits|no endpoints|not found|rate limit/i.test(
    message,
  );
}

function toOpenRouterAppError(status: number, retriable = false): AppError {
  if (status === 402) {
    return new AppError(AppErrorCode.AI_CREDITS_EXHAUSTED, { retriable });
  }

  return new AppError(AppErrorCode.AI_UNAVAILABLE, { retriable });
}

function mapTransportError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    const text = getErrorText(error);

    if (/CONNECT_TIMEOUT|ETIMEDOUT|timeout/i.test(text)) {
      return new AppError(AppErrorCode.AI_UNAVAILABLE, { retriable: true });
    }

    if (/ENOTFOUND|ECONNREFUSED|EAI_AGAIN|fetch failed/i.test(text)) {
      return new AppError(AppErrorCode.NETWORK_ERROR);
    }
  }

  return new AppError(AppErrorCode.AI_UNAVAILABLE);
}

function extractMessageContent(message: {
  content?: string;
  reasoning?: string;
}): string {
  let content = typeof message.content === "string" ? message.content : "";

  if (!content.trim() && typeof message.reasoning === "string") {
    content = message.reasoning;
  }

  return content.replace(/[\s\S]*?<\/think>/gi, "").trim();
}

export function isGarbageModelContent(content: string): boolean {
  const trimmed = content.trim();

  if (!trimmed) return true;
  if (/^user safety:/i.test(trimmed)) return true;

  return false;
}

async function requestWithModel(
  model: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  let response: Awaited<ReturnType<typeof httpsPost>>;

  try {
    response = await httpsPost(
      OPENROUTER_API_URL,
      {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Referent",
      },
      JSON.stringify({ model, messages }),
    );
  } catch (error) {
    throw mapTransportError(error);
  }

  const responseText = response.body.toString("utf8");

  if (response.status < 200 || response.status >= 300) {
    const message = parseErrorMessage(responseText);
    throw toOpenRouterAppError(
      response.status,
      isRetriableModelError(response.status, message),
    );
  }

  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: string; reasoning?: string } }>;
  };
  const content = extractMessageContent(data.choices?.[0]?.message ?? {});

  if (!content) {
    throw new AppError(AppErrorCode.AI_EMPTY_RESPONSE, { retriable: true });
  }

  if (isGarbageModelContent(content)) {
    throw new AppError(AppErrorCode.AI_EMPTY_RESPONSE, { retriable: true });
  }

  return content;
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new AppError(AppErrorCode.AI_CONFIG_MISSING);
  }

  const models = getModelCandidates();
  let lastError: AppError | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await requestWithModel(model, messages, apiKey);
      } catch (error) {
        const appError =
          error instanceof AppError ? error : mapTransportError(error);

        lastError = appError;

        const isLastAttempt = attempt === MAX_ATTEMPTS_PER_MODEL;
        const isLastModel = model === models[models.length - 1];

        if (!appError.retriable || (isLastAttempt && isLastModel)) {
          throw appError;
        }

        if (isLastAttempt) {
          break;
        }
      }
    }
  }

  throw lastError ?? new AppError(AppErrorCode.AI_UNAVAILABLE);
}
