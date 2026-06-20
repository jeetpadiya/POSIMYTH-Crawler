import type { CrawledPage } from "./crawler.js";

const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_CHUNK_OVERLAP = 180;
const MIN_CHUNK_LENGTH = 80;

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
    const end = Math.min(start + chunkSize, normalizedText.length);
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
