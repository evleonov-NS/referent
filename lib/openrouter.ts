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

function formatOpenRouterError(status: number, errorText: string): string {
  const message = parseErrorMessage(errorText);

  if (status === 402) {
    return "Недостаточно кредитов на OpenRouter. Пополните баланс на openrouter.ai/settings/credits или используйте бесплатную модель (уберите OPENROUTER_MODEL из .env.local).";
  }

  return `Ошибка OpenRouter: ${message}`;
}

function isRetriableModelError(status: number, message: string): boolean {
  if (status === 402 || status === 404 || status === 429) return true;

  return /unavailable for free|insufficient credits|no endpoints|not found|rate limit/i.test(
    message,
  );
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
    const error = new Error(formatOpenRouterError(response.status, errorText));
    (error as Error & { status?: number; retriable?: boolean }).status =
      response.status;
    (error as Error & { status?: number; retriable?: boolean }).retriable =
      isRetriableModelError(response.status, message);
    throw error;
  }

  const data = await response.json();
  const content = extractMessageContent(data.choices?.[0]?.message ?? {});

  if (!content) {
    const error = new Error("Модель вернула пустой ответ");
    (error as Error & { retriable?: boolean }).retriable = true;
    throw error;
  }

  if (isGarbageModelContent(content)) {
    const error = new Error("Модель вернула служебный ответ вместо результата");
    (error as Error & { retriable?: boolean }).retriable = true;
    throw error;
  }

  return content;
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не настроен в .env.local");
  }

  const models = getModelCandidates();
  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await requestWithModel(model, messages, apiKey);
      } catch (error) {
        if (!(error instanceof Error)) throw error;

        lastError = error;

        const retriable =
          (error as Error & { retriable?: boolean }).retriable === true;
        const isLastAttempt = attempt === MAX_ATTEMPTS_PER_MODEL;
        const isLastModel = model === models[models.length - 1];

        if (!retriable || (isLastAttempt && isLastModel)) {
          throw error;
        }

        if (isLastAttempt) {
          break;
        }
      }
    }
  }

  throw lastError ?? new Error("Не удалось выполнить запрос к OpenRouter");
}
