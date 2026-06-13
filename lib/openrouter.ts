import { AppError, AppErrorCode } from "@/lib/app-errors";

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
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Referent",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = parseErrorMessage(errorText);
    throw toOpenRouterAppError(
      response.status,
      isRetriableModelError(response.status, message),
    );
  }

  const data = await response.json();
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
        if (!(error instanceof AppError)) {
          throw error;
        }

        lastError = error;

        const isLastAttempt = attempt === MAX_ATTEMPTS_PER_MODEL;
        const isLastModel = model === models[models.length - 1];

        if (!error.retriable || (isLastAttempt && isLastModel)) {
          throw error;
        }

        if (isLastAttempt) {
          break;
        }
      }
    }
  }

  throw lastError ?? new AppError(AppErrorCode.AI_UNAVAILABLE);
}
