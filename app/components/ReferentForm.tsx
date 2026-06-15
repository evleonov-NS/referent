"use client";

import { useEffect, useRef, useState } from "react";

import { ErrorAlert } from "@/app/components/ErrorAlert";
import { AppErrorCode, getErrorMessage } from "@/lib/app-errors";
import { fetchApi, resolveClientError } from "@/lib/client-api";
import {
  estimateIllustrationSeconds,
  estimateReplySeconds,
  estimateSummarySeconds,
  estimateThesesSeconds,
  estimateTranslationSeconds,
} from "@/lib/translation";

type ArticleAction = "summary" | "theses" | "translation" | "illustration";

const textareaClass =
  "box-border w-full min-w-0 max-w-full min-h-30 resize-y break-words rounded-md border border-slate-300 p-3 text-base text-slate-900 placeholder:text-slate-400 [overflow-wrap:anywhere] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-sm";

const autoHeightTextareaClass = `${textareaClass} min-h-30 resize-none overflow-hidden`;

const buttonClass =
  "rounded-md bg-blue-600 px-5 py-2.5 text-center text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "rounded-md border border-slate-300 bg-white px-5 py-2.5 text-center text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const actionButtonGroupClass =
  "mb-5 flex w-full flex-col gap-3 md:flex-row md:flex-wrap";

const actionButtonClass = `${buttonClass} w-full md:w-auto`;

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
  const [articleImage, setArticleImage] = useState("");
  const [articleError, setArticleError] = useState("");
  const [articleCopied, setArticleCopied] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleLoadingText, setArticleLoadingText] = useState("");
  const [translationCountdown, setTranslationCountdown] = useState<number | null>(
    null,
  );
  const articleResultRef = useRef<HTMLTextAreaElement>(null);
  const articleResultSectionRef = useRef<HTMLDivElement>(null);
  const letterTextRef = useRef<HTMLTextAreaElement>(null);
  const letterTranslationSectionRef = useRef<HTMLDivElement>(null);
  const letterRepliesSectionRef = useRef<HTMLDivElement>(null);
  const letterTranslationRef = useRef<HTMLTextAreaElement>(null);
  const replyOriginalRef = useRef<HTMLTextAreaElement>(null);
  const replyRussianRef = useRef<HTMLTextAreaElement>(null);

  const [letterText, setLetterText] = useState("");
  const [letterTranslation, setLetterTranslation] = useState("");
  const [replyOriginal, setReplyOriginal] = useState("");
  const [replyRussian, setReplyRussian] = useState("");
  const [letterError, setLetterError] = useState("");
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterLoadingText, setLetterLoadingText] = useState("");
  const [letterCountdown, setLetterCountdown] = useState<number | null>(null);
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

  useEffect(() => {
    adjustTextareaHeight(letterTextRef.current);
    adjustTextareaHeight(letterTranslationRef.current);
    adjustTextareaHeight(replyOriginalRef.current);
    adjustTextareaHeight(replyRussianRef.current);
  }, [letterText, letterTranslation, replyOriginal, replyRussian]);

  const isArticleCountingDown = articleLoading && translationCountdown !== null;
  const isLetterCountingDown = letterLoading && letterCountdown !== null;

  useEffect(() => {
    if (!isArticleCountingDown) return;

    const timerId = window.setInterval(() => {
      setTranslationCountdown((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isArticleCountingDown]);

  useEffect(() => {
    if (!isLetterCountingDown) return;

    const timerId = window.setInterval(() => {
      setLetterCountdown((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isLetterCountingDown]);

  function adjustTextareaHeight(textarea: HTMLTextAreaElement | null) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleClear() {
    setArticleInput("");
    setArticleResult("");
    setArticleImage("");
    setArticleError("");
    setArticleCopied(false);
    setArticleLoading(false);
    setArticleLoadingText("");
    setTranslationCountdown(null);

    setLetterText("");
    setLetterTranslation("");
    setReplyOriginal("");
    setReplyRussian("");
    setLetterError("");
    setLetterLoading(false);
    setLetterLoadingText("");
    setLetterCountdown(null);
    setTranslationCopied(false);
    setReplyOriginalCopied(false);
    setReplyRussianCopied(false);
  }

  const isBusy = articleLoading || letterLoading;

  async function runArticleAction(
    action: ArticleAction,
    options: {
      endpoint: string;
      progressText: string;
      estimateSeconds: (charCount: number) => number;
      pickResult: (data: Record<string, string | undefined>) => string;
    },
  ) {
    const inputType = parseArticleInput(articleInput);
    if (!inputType) {
      setArticleError(getErrorMessage(AppErrorCode.ARTICLE_INPUT_REQUIRED));
      return;
    }

    const parsePayload =
      inputType === "url"
        ? { url: articleInput.trim() }
        : { text: articleInput.trim() };

    setArticleError("");
    setArticleCopied(false);
    setArticleLoading(true);
    setArticleResult("");
    setArticleImage("");
    setTranslationCountdown(null);
    setArticleLoadingText("Загрузка и парсинг статьи...");

    try {
      const parsed = await fetchApi<{
        date: string;
        title: string;
        content: string;
      }>("/api/parse-article", parsePayload);

      if (!parsed.content.trim()) {
        setArticleError(getErrorMessage(AppErrorCode.ARTICLE_EMPTY_CONTENT));
        return;
      }

      const estimatedSeconds = options.estimateSeconds(parsed.content.length);
      setTranslationCountdown(estimatedSeconds);
      setArticleLoadingText(
        `Текст получен (${parsed.content.length.toLocaleString("ru-RU")} символов). ${options.progressText}`,
      );

      const result = await fetchApi<Record<string, string | undefined>>(
        options.endpoint,
        {
          text: parsed.content,
          title: parsed.title,
          date: parsed.date,
        },
      );

      setArticleResult(options.pickResult(result));
      scrollToSection(articleResultSectionRef);
    } catch (error) {
      setArticleError(resolveClientError(error));
    } finally {
      setArticleLoading(false);
      setArticleLoadingText("");
      setTranslationCountdown(null);
    }
  }

  async function handleArticleAction(action: ArticleAction) {
    if (action === "illustration") {
      const inputType = parseArticleInput(articleInput);
      if (!inputType) {
        setArticleError(getErrorMessage(AppErrorCode.ARTICLE_INPUT_REQUIRED));
        return;
      }

      const parsePayload =
        inputType === "url"
          ? { url: articleInput.trim() }
          : { text: articleInput.trim() };

      setArticleError("");
      setArticleCopied(false);
      setArticleLoading(true);
      setArticleResult("");
      setArticleImage("");
      setTranslationCountdown(null);
      setArticleLoadingText("Загрузка и парсинг статьи...");

      try {
        const parsed = await fetchApi<{
          date: string;
          title: string;
          content: string;
        }>("/api/parse-article", parsePayload);

        if (!parsed.content.trim()) {
          setArticleError(getErrorMessage(AppErrorCode.ARTICLE_EMPTY_CONTENT));
          return;
        }

        const estimatedSeconds = estimateIllustrationSeconds(
          parsed.content.length,
        );
        setTranslationCountdown(estimatedSeconds);
        setArticleLoadingText(
          `Текст получен (${parsed.content.length.toLocaleString("ru-RU")} символов). Создание промпта, иллюстрации и перевода...`,
        );

        const result = await fetchApi<{
          translation: string;
          image: string;
        }>("/api/illustrate-article", {
          text: parsed.content,
          title: parsed.title,
          date: parsed.date,
        });

        setArticleImage(result.image ?? "");
        setArticleResult(result.translation ?? "");
        scrollToSection(articleResultSectionRef);
      } catch (error) {
        setArticleError(resolveClientError(error));
      } finally {
        setArticleLoading(false);
        setArticleLoadingText("");
        setTranslationCountdown(null);
      }

      return;
    }

    if (action === "translation") {
      await runArticleAction("translation", {
        endpoint: "/api/translate-article",
        progressText: "Идёт перевод...",
        estimateSeconds: estimateTranslationSeconds,
        pickResult: (data) => data.translation ?? "",
      });
      return;
    }

    if (action === "summary") {
      await runArticleAction("summary", {
        endpoint: "/api/summarize-article",
        progressText: "Анализ статьи...",
        estimateSeconds: estimateSummarySeconds,
        pickResult: (data) => data.summary ?? "",
      });
      return;
    }

    await runArticleAction("theses", {
      endpoint: "/api/article-theses",
      progressText: "Выделение тезисов...",
      estimateSeconds: estimateThesesSeconds,
      pickResult: (data) => data.theses ?? "",
    });
  }

  async function handleTranslateLetter() {
    if (!letterText.trim()) {
      setLetterError(getErrorMessage(AppErrorCode.LETTER_INPUT_REQUIRED));
      return;
    }

    const textLength = letterText.trim().length;

    setLetterError("");
    setLetterLoading(true);
    setLetterCountdown(estimateTranslationSeconds(textLength));
    setLetterLoadingText(
      `Текст получен (${textLength.toLocaleString("ru-RU")} символов). Идёт перевод письма...`,
    );
    setLetterTranslation("");

    try {
      const data = await fetchApi<{ translation: string }>(
        "/api/translate-letter",
        { text: letterText.trim() },
      );

      setLetterTranslation(data.translation ?? "");
      scrollToSection(letterTranslationSectionRef);
    } catch (error) {
      setLetterError(resolveClientError(error));
    } finally {
      setLetterLoading(false);
      setLetterLoadingText("");
      setLetterCountdown(null);
    }
  }

  async function handlePrepareReply() {
    if (!letterText.trim()) {
      setLetterError(getErrorMessage(AppErrorCode.LETTER_INPUT_REQUIRED));
      return;
    }

    const textLength = letterText.trim().length;

    setLetterError("");
    setLetterLoading(true);
    setLetterCountdown(estimateReplySeconds(textLength));
    setLetterLoadingText(
      `Текст получен (${textLength.toLocaleString("ru-RU")} символов). Подготовка ответа...`,
    );
    setReplyOriginal("");
    setReplyRussian("");

    try {
      const data = await fetchApi<{
        replyOriginal: string;
        replyRussian: string;
      }>("/api/prepare-letter-reply", { text: letterText.trim() });

      setReplyOriginal(data.replyOriginal ?? "");
      setReplyRussian(data.replyRussian ?? "");
      scrollToSection(letterRepliesSectionRef);
    } catch (error) {
      setLetterError(resolveClientError(error));
    } finally {
      setLetterLoading(false);
      setLetterLoadingText("");
      setLetterCountdown(null);
    }
  }

  return (
    <div className="min-w-0 space-y-8 md:space-y-10">
      <div className="flex w-full justify-stretch md:justify-end">
        <button
          type="button"
          className={`${secondaryButtonClass} w-full md:w-auto`}
          disabled={isBusy}
          onClick={handleClear}
        >
          Очистить
        </button>
      </div>

      <section className="border-b border-slate-200 pb-8 md:pb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 md:mb-5 md:text-xl">
          Статьи
        </h2>

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

        <div className={actionButtonGroupClass} data-testid="article-actions">
          <button
            type="button"
            className={actionButtonClass}
            disabled={articleLoading}
            onClick={() => void handleArticleAction("summary")}
          >
            О чем статья?
          </button>
          <button
            type="button"
            className={actionButtonClass}
            disabled={articleLoading}
            onClick={() => void handleArticleAction("theses")}
          >
            Тезисы
          </button>
          <button
            type="button"
            className={actionButtonClass}
            disabled={articleLoading}
            onClick={() => void handleArticleAction("translation")}
          >
            Подробный перевод
          </button>
          <button
            type="button"
            className={actionButtonClass}
            disabled={articleLoading}
            onClick={() => void handleArticleAction("illustration")}
          >
            Иллюстрация
          </button>
        </div>

        {articleLoading && articleLoadingText && (
          <div className="mb-5 break-words rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-slate-700">
            <p>{articleLoadingText}</p>
            {translationCountdown !== null && translationCountdown > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                Ориентировочное время: ~{translationCountdown} сек.
              </p>
            )}
          </div>
        )}

        {articleError && <ErrorAlert className="mb-5" message={articleError} />}

        <div ref={articleResultSectionRef} className="relative min-w-0 scroll-mt-6">
          {articleImage && (
            <div className="mb-5 min-w-0">
              <p className="mb-1.5 font-medium text-slate-900">Иллюстрация</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={articleImage}
                alt="Иллюстрация к статье"
                className="w-full max-w-full rounded-md border border-slate-300"
              />
            </div>
          )}

          <label
            htmlFor="article-result"
            className="mb-1.5 block font-medium text-slate-900"
          >
            {articleImage ? "Подробный перевод" : "Результат"}
            {articleResult && (
              <span className="mt-1 block text-sm font-normal text-slate-500 md:mt-0 md:inline">
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
            placeholder="Здесь появится результат анализа, перевод или иллюстрация к статье..."
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900 md:mb-5 md:text-xl">
          Письма
        </h2>

        <div className={actionButtonGroupClass} data-testid="letter-actions">
          <button
            type="button"
            className={actionButtonClass}
            disabled={letterLoading}
            onClick={() => void handleTranslateLetter()}
          >
            Перевести письмо
          </button>
          <button
            type="button"
            className={actionButtonClass}
            disabled={letterLoading}
            onClick={() => void handlePrepareReply()}
          >
            Подготовить ответ
          </button>
        </div>

        {letterLoading && letterLoadingText && (
          <div className="mb-5 break-words rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-slate-700">
            <p>{letterLoadingText}</p>
            {letterCountdown !== null && letterCountdown > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                Ориентировочное время: ~{letterCountdown} сек.
              </p>
            )}
          </div>
        )}

        {letterError && <ErrorAlert className="mb-5" message={letterError} />}

        <div className="mb-5 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="letter-text"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Текст письма
            </label>
            <textarea
              ref={letterTextRef}
              id="letter-text"
              rows={1}
              className={autoHeightTextareaClass}
              placeholder="Вставьте текст письма на иностранном языке..."
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
            />
          </div>

          <div
            ref={letterTranslationSectionRef}
            className="relative min-w-0 scroll-mt-6"
          >
            <label
              htmlFor="letter-translation"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Перевод
              {letterTranslation && (
                <span className="mt-1 block text-sm font-normal text-slate-500 md:mt-0 md:inline">
                  — нажмите, чтобы скопировать
                </span>
              )}
            </label>
            <textarea
              ref={letterTranslationRef}
              id="letter-translation"
              readOnly
              rows={1}
              className={`${autoHeightTextareaClass} ${copyableClass(translationCopied)}`}
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

        <div
          ref={letterRepliesSectionRef}
          className="grid min-w-0 scroll-mt-6 grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="relative min-w-0">
            <label
              htmlFor="reply-original"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Ответ на языке оригинала
              {replyOriginal && (
                <span className="mt-1 block text-sm font-normal text-slate-500 md:mt-0 md:inline">
                  — нажмите, чтобы скопировать
                </span>
              )}
            </label>
            <textarea
              ref={replyOriginalRef}
              id="reply-original"
              readOnly
              rows={1}
              className={`${autoHeightTextareaClass} ${copyableClass(replyOriginalCopied)}`}
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

          <div className="relative min-w-0">
            <label
              htmlFor="reply-russian"
              className="mb-1.5 block font-medium text-slate-900"
            >
              Ответ на русском
              {replyRussian && (
                <span className="mt-1 block text-sm font-normal text-slate-500 md:mt-0 md:inline">
                  — нажмите, чтобы скопировать
                </span>
              )}
            </label>
            <textarea
              ref={replyRussianRef}
              id="reply-russian"
              readOnly
              rows={1}
              className={`${autoHeightTextareaClass} ${copyableClass(replyRussianCopied)}`}
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
