"use client";

import { useEffect, useRef, useState } from "react";

type ArticleAction = "summary" | "theses" | "translation";

const textareaClass =
  "w-full min-h-30 resize-y rounded-md border border-slate-300 p-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

const columnTextareaClass = `${textareaClass} min-h-50`;

const buttonClass =
  "rounded-md bg-blue-600 px-5 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400";

function parseArticleInput(value: string): "url" | "text" | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\/\S+$/i.test(trimmed) || /^www\.\S+$/i.test(trimmed)) {
    return "url";
  }

  return "text";
}

function copyableClass(copied: boolean) {
  return [
    "cursor-pointer transition-colors hover:border-blue-500",
    copied ? "border-green-500 bg-green-50" : "bg-white",
  ].join(" ");
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error instanceof Event) return "Операция прервана";
  return "Неизвестная ошибка";
}

function adjustTextareaHeight(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

async function copyText(text: string, onCopied: () => void) {
  if (!text.trim()) return;

  try {
    await navigator.clipboard.writeText(text);
    onCopied();
  } catch {
    // Браузер мог запретить clipboard — не пробрасываем ошибку в React.
  }
}

export default function ReferentForm() {
  const [articleInput, setArticleInput] = useState("");
  const [articleResult, setArticleResult] = useState("");
  const [articleError, setArticleError] = useState("");
  const [articleCopied, setArticleCopied] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);
  const articleResultRef = useRef<HTMLTextAreaElement>(null);

  const [letterText, setLetterText] = useState("");
  const [letterTranslation, setLetterTranslation] = useState("");
  const [replyOriginal, setReplyOriginal] = useState("");
  const [replyRussian, setReplyRussian] = useState("");
  const [letterError, setLetterError] = useState("");
  const [translationCopied, setTranslationCopied] = useState(false);
  const [replyOriginalCopied, setReplyOriginalCopied] = useState(false);
  const [replyRussianCopied, setReplyRussianCopied] = useState(false);

  function flashCopied(setter: (value: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 1500);
  }

  useEffect(() => {
    adjustTextareaHeight(articleResultRef.current);
  }, [articleResult]);

  async function handleArticleAction(_action: ArticleAction) {
    const inputType = parseArticleInput(articleInput);
    if (!inputType) {
      setArticleError("Вставьте ссылку на статью или текст.");
      return;
    }

    setArticleError("");
    setArticleCopied(false);
    setArticleLoading(true);
    setArticleResult("");

    try {
      const response = await fetch("/api/parse-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inputType === "url"
            ? { url: articleInput.trim() }
            : { text: articleInput.trim() },
        ),
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Сервер вернул некорректный ответ");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось обработать статью");
      }

      setArticleResult(
        JSON.stringify(
          {
            date: data.date ?? "",
            title: data.title ?? "",
            content: data.content ?? "",
          },
          null,
          2,
        ),
      );
    } catch (error) {
      setArticleError(formatError(error));
    } finally {
      setArticleLoading(false);
    }
  }

  function handleTranslateLetter() {
    if (!letterText.trim()) {
      setLetterError("Вставьте текст письма.");
      return;
    }

    setLetterError("");
    setLetterTranslation(
      "Подробный перевод письма появится здесь после подключения AI.",
    );
  }

  function handlePrepareReply() {
    if (!letterText.trim()) {
      setLetterError("Вставьте текст письма.");
      return;
    }

    setLetterError("");
    setReplyOriginal(
      "Ответ на языке оригинала появится здесь после подключения AI.",
    );
    setReplyRussian("Ответ на русском появится здесь после подключения AI.");
  }

  return (
    <div className="space-y-10">
      <section className="border-b border-slate-200 pb-10">
        <h2 className="mb-5 text-xl font-semibold text-slate-900">Статьи</h2>

        <div className="mb-5">
          <label
            htmlFor="article-input"
            className="mb-1.5 block font-medium text-slate-900"
          >
            Статья
          </label>
          <textarea
            id="article-input"
            className={textareaClass}
            placeholder="Вставьте ссылку на статью или скопированный текст — приложение само определит, что это"
            value={articleInput}
            onChange={(e) => setArticleInput(e.target.value)}
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            disabled={articleLoading}
            onClick={() => void handleArticleAction("summary")}
          >
            О чем статья?
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={articleLoading}
            onClick={() => void handleArticleAction("theses")}
          >
            Тезисы
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={articleLoading}
            onClick={() => void handleArticleAction("translation")}
          >
            Подробный перевод
          </button>
        </div>

        {articleLoading && (
          <p className="mb-5 text-slate-600">Загрузка и парсинг статьи...</p>
        )}

        {articleError && (
          <p className="mb-5 text-red-700">{articleError}</p>
        )}

        <div className="relative">
          <label
            htmlFor="article-result"
            className="mb-1.5 block font-medium text-slate-900"
          >
            Результат
            {articleResult && (
              <span className="text-sm font-normal text-slate-500">
                {" "}
                — нажмите, чтобы скопировать
              </span>
            )}
          </label>
          <textarea
            ref={articleResultRef}
            id="article-result"
            readOnly
            rows={1}
            className={`${textareaClass} resize-none overflow-hidden ${copyableClass(articleCopied)}`}
            placeholder="Здесь появится JSON с датой, заголовком и содержимым статьи..."
            value={articleResult}
            onClick={() =>
              void copyText(articleResult, () => flashCopied(setArticleCopied))
            }
            title={articleResult ? "Нажмите, чтобы скопировать" : undefined}
          />
          {articleCopied && (
            <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-green-600 px-2 py-0.5 text-xs text-white">
              Скопировано
            </span>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-xl font-semibold text-slate-900">Письма</h2>

        <div className="mb-5 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={handleTranslateLetter}
          >
            Перевести письмо
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={handlePrepareReply}
          >
            Подготовить ответ
          </button>
        </div>

        {letterError && <p className="mb-5 text-red-700">{letterError}</p>}

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="letter-text"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Текст письма
            </label>
            <textarea
              id="letter-text"
              className={columnTextareaClass}
              placeholder="Вставьте текст письма на иностранном языке..."
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
            />
          </div>

          <div className="relative">
            <label
              htmlFor="letter-translation"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Перевод
              {letterTranslation && (
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  — нажмите, чтобы скопировать
                </span>
              )}
            </label>
            <textarea
              id="letter-translation"
              readOnly
              className={`${columnTextareaClass} ${copyableClass(translationCopied)}`}
              placeholder="Здесь появится перевод письма..."
              value={letterTranslation}
              onClick={() =>
                void copyText(letterTranslation, () =>
                  flashCopied(setTranslationCopied),
                )
              }
              title={
                letterTranslation ? "Нажмите, чтобы скопировать" : undefined
              }
            />
            {translationCopied && (
              <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-green-600 px-2 py-0.5 text-xs text-white">
                Скопировано
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <label
              htmlFor="reply-original"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Ответ на языке оригинала
              {replyOriginal && (
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  — нажмите, чтобы скопировать
                </span>
              )}
            </label>
            <textarea
              id="reply-original"
              readOnly
              className={`${columnTextareaClass} ${copyableClass(replyOriginalCopied)}`}
              placeholder="Здесь появится ответ на языке оригинала..."
              value={replyOriginal}
              onClick={() =>
                void copyText(replyOriginal, () =>
                  flashCopied(setReplyOriginalCopied),
                )
              }
              title={replyOriginal ? "Нажмите, чтобы скопировать" : undefined}
            />
            {replyOriginalCopied && (
              <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-green-600 px-2 py-0.5 text-xs text-white">
                Скопировано
              </span>
            )}
          </div>

          <div className="relative">
            <label
              htmlFor="reply-russian"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Ответ на русском
              {replyRussian && (
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  — нажмите, чтобы скопировать
                </span>
              )}
            </label>
            <textarea
              id="reply-russian"
              readOnly
              className={`${columnTextareaClass} ${copyableClass(replyRussianCopied)}`}
              placeholder="Здесь появится ответ на русском..."
              value={replyRussian}
              onClick={() =>
                void copyText(replyRussian, () =>
                  flashCopied(setReplyRussianCopied),
                )
              }
              title={replyRussian ? "Нажмите, чтобы скопировать" : undefined}
            />
            {replyRussianCopied && (
              <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-green-600 px-2 py-0.5 text-xs text-white">
                Скопировано
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
