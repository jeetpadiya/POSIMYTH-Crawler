import type { CrawledPage } from "./crawler.js";

const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_CHUNK_OVERLAP = 180;
const MIN_CHUNK_LENGTH = 80;
const SENTENCE_SEARCH_WINDOW = 200;

export type TextChunk = {
  id: string;
  url: string;
  title: string;
  text: string;
  chunkIndex: number;
  depth: number;
};

export type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

export const chunkPages = (
  pages: CrawledPage[],
  options: ChunkOptions = {},
): TextChunk[] => {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  if (chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap must be smaller than chunkSize.");
  }

  return pages.flatMap((page) => chunkPage(page, chunkSize, chunkOverlap));
};

const chunkPage = (
  page: CrawledPage,
  chunkSize: number,
  chunkOverlap: number,
): TextChunk[] => {
  const normalizedText = normalizeText(page.text);
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    const hardEnd = Math.min(start + chunkSize, normalizedText.length);
    const end = hardEnd < normalizedText.length
      ? findSentenceBoundary(normalizedText, hardEnd, SENTENCE_SEARCH_WINDOW)
      : hardEnd;
    const chunkText = normalizedText.slice(start, end).trim();

    if (chunkText.length >= MIN_CHUNK_LENGTH) {
      chunks.push({
        id: `${page.url}#chunk-${chunks.length}`,
        url: page.url,
        title: page.title,
        text: chunkText,
        chunkIndex: chunks.length,
        depth: page.depth,
      });
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = end - chunkOverlap;
  }

  return chunks;
};

const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Looks back from `hardEnd` up to `window` characters to find the position
 * just after a sentence-ending punctuation mark (. ! ?). Falls back to
 * `hardEnd` when no boundary is found within the window.
 */
const findSentenceBoundary = (
  text: string,
  hardEnd: number,
  window: number,
): number => {
  const searchStart = Math.max(0, hardEnd - window);
  const slice = text.slice(searchStart, hardEnd);
  const match = slice.match(/.*[.!?](?=\s|$)/s);

  if (match && match[0].length > 0) {
    return searchStart + match[0].length;
  }

  return hardEnd;
};
