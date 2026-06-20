import axios from "axios";
import type { SearchResult } from "./vectorStore.js";

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const MAX_CONTEXT_CHARS_PER_CHUNK = 1200;

export type Source = {
  url: string;
  title: string;
  chunkIndex: number;
};

export type GroundedAnswer = {
  answer: string;
  sources: Source[];
  modelUsed: string | null;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ProviderErrorBody = {
  error?: {
    message?: string;
  };
};

export const generateGroundedAnswer = async (
  question: string,
  results: SearchResult[],
): Promise<GroundedAnswer> => {
  const sources = getUniqueSources(results);
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return {
      answer:
        "I found relevant source text, but no LLM API key is configured. Set LLM_API_KEY or OPENAI_API_KEY to generate a natural-language answer.",
      sources,
      modelUsed: null,
    };
  }

  let response;

  try {
    response = await axios.post<ChatCompletionResponse>(
      `${baseUrl}/chat/completions`,
      {
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You answer questions using only the provided website context. If the context does not contain the answer, say that the crawled site does not provide enough information. Do not use outside knowledge. Keep the answer concise. Cite the source URL for each factual claim you use.",
          },
          {
            role: "user",
            content: buildPrompt(question, results),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );
  } catch (error) {
    throw new Error(formatLlmError(error, baseUrl, model));
  }

  const answer = response.data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("LLM returned an empty response.");
  }

  return {
    answer,
    sources,
    modelUsed: model,
  };
};

const buildPrompt = (question: string, results: SearchResult[]) => {
  const context = results
    .map((result, index) => {
      const sourceNumber = index + 1;
      const chunk = result.chunk;
      const text = chunk.text.slice(0, MAX_CONTEXT_CHARS_PER_CHUNK);

      return [
        `Source ${sourceNumber}`,
        `Title: ${chunk.title}`,
        `URL: ${chunk.url}`,
        `Chunk: ${chunk.chunkIndex}`,
        `Text: ${text}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "Website context:",
    context,
    "",
    `Question: ${question}`,
    "",
    "Answer using only the website context above.",
    "When you use a fact, cite the exact URL from the matching source in parentheses.",
    "If the context does not answer the question, say the crawled site does not provide enough information.",
  ].join("\n");
};

const formatLlmError = (error: unknown, baseUrl: string, model: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Unknown LLM provider error";
  }

  const status = error.response?.status;
  const providerMessage = getProviderMessage(error.response?.data);

  if (status === 401 || status === 403) {
    return `LLM provider rejected the API key or permissions. Check LLM_API_KEY. Provider status: ${status}.`;
  }

  if (status === 404) {
    return `LLM provider endpoint or model was not found. Check LLM_BASE_URL (${baseUrl}) and LLM_MODEL (${model}). Provider status: 404.${providerMessage}`;
  }

  if (status === 429) {
    return `LLM provider rate limit or quota was reached. Try again later or check your free-tier quota. Provider status: 429.${providerMessage}`;
  }

  if (status) {
    return `LLM provider request failed with status ${status}.${providerMessage}`;
  }

  return `LLM provider request failed before receiving a response: ${error.message}`;
};

const getProviderMessage = (data: unknown) => {
  if (!isProviderErrorBody(data)) {
    return "";
  }

  const message = data.error?.message;

  return message ? ` Message: ${message}` : "";
};

const isProviderErrorBody = (data: unknown): data is ProviderErrorBody => {
  if (!data || typeof data !== "object" || !("error" in data)) {
    return false;
  }

  const error = data.error;

  return Boolean(error && typeof error === "object");
};

const getUniqueSources = (results: SearchResult[]): Source[] => {
  const sources = new Map<string, Source>();

  for (const result of results) {
    const key = `${result.chunk.url}#${result.chunk.chunkIndex}`;

    if (!sources.has(key)) {
      sources.set(key, {
        url: result.chunk.url,
        title: result.chunk.title,
        chunkIndex: result.chunk.chunkIndex,
      });
    }
  }

  return [...sources.values()];
};
