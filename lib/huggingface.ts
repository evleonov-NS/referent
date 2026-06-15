import { AppError, AppErrorCode } from "@/lib/app-errors";

const DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const HF_INFERENCE_URL = "https://api-inference.huggingface.co/models";
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;

function getModelId(): string {
  return process.env.HUGGINGFACE_MODEL?.trim() || DEFAULT_MODEL;
}

function isModelLoading(status: number, body: string): boolean {
  return (
    status === 503 &&
    /loading|currently loading|model is loading/i.test(body)
  );
}

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string };
    return json.error ?? JSON.stringify(json);
  } catch {
    return await response.text();
  }
}

export async function generateIllustration(prompt: string): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();

  if (!apiKey) {
    throw new AppError(AppErrorCode.IMAGE_CONFIG_MISSING);
  }

  const modelId = getModelId();
  const endpoint = `${HF_INFERENCE_URL}/${modelId}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (response.ok && contentType.startsWith("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    const errorBody = await parseErrorBody(response);

    if (isModelLoading(response.status, errorBody) && attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }

    throw new AppError(AppErrorCode.IMAGE_GENERATION_FAILED, {
      retriable: isModelLoading(response.status, errorBody),
    });
  }

  throw new AppError(AppErrorCode.IMAGE_GENERATION_FAILED);
}
