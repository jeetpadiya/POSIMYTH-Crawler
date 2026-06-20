import type { TextChunk } from "./chunker.js";

const DEFAULT_TOP_K = 5;
const MIN_QUERY_TERM_LENGTH = 3;
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "you",
  "your",
  "with",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "how",
  "does",
  "did",
  "can",
  "from",
  "this",
  "that",
  "about",
  "into",
]);

export type SearchResult = {
  chunk: TextChunk;
  score: number;
  matchedTerms: string[];
};

let indexedChunks: TextChunk[] = [];

export const replaceChunks = (chunks: TextChunk[]) => {
  indexedChunks = chunks;
};

export const clearChunks = () => {
  indexedChunks = [];
};

export const getIndexStats = () => ({
  chunkCount: indexedChunks.length,
  sourceCount: new Set(indexedChunks.map((chunk) => chunk.url)).size,
});

export const searchChunks = (
  query: string,
  topK = DEFAULT_TOP_K,
): SearchResult[] => {
  const queryTerms = tokenize(query);

  if (queryTerms.length === 0 || indexedChunks.length === 0) {
    return [];
  }

  return indexedChunks
    .map((chunk) => scoreChunk(chunk, queryTerms))
    .filter((result) => result.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, topK);
};

const scoreChunk = (chunk: TextChunk, queryTerms: string[]): SearchResult => {
  const chunkText = `${chunk.title} ${chunk.text}`.toLowerCase();
  const matchedTerms = queryTerms.filter((term) => chunkText.includes(term));
  const uniqueMatchedTerms = [...new Set(matchedTerms)];

  return {
    chunk,
    score: uniqueMatchedTerms.length / queryTerms.length,
    matchedTerms: uniqueMatchedTerms,
  };
};

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(
      (term) =>
        term.length >= MIN_QUERY_TERM_LENGTH && !STOP_WORDS.has(term),
    );
