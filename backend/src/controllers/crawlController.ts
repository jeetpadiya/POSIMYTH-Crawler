import type { Request, Response } from "express";
import { chunkPages } from "../services/chunker.js";
import { crawlSite } from "../services/crawler.js";
import { getIndexStats, replaceChunks, clearChunks } from "../services/vectorStore.js";

export const clearIndex = (_req: Request, res: Response) => {
  clearChunks();
  return res.json({ message: "Index cleared successfully." });
};

export const crawlWebsite = async (req: Request, res: Response) => {
  const { url, maxPages, maxDepth, chunkSize, chunkOverlap } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "A website URL is required.",
    });
  }

  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        error: "Only http and https URLs are supported.",
      });
    }
  } catch {
    return res.status(400).json({
      error: "Please provide a valid URL.",
    });
  }

  try {
    const result = await crawlSite(url, {
      maxPages: parsePositiveNumber(maxPages),
      maxDepth: parsePositiveNumber(maxDepth),
    });
    const chunks = chunkPages(result.pages, {
      chunkSize: parsePositiveNumber(chunkSize),
      chunkOverlap: parsePositiveNumber(chunkOverlap),
    });
    replaceChunks(chunks);
    const indexStats = getIndexStats();

    return res.json({
      message: "Crawl and chunking completed.",
      startUrl: result.startUrl,
      pageCount: result.pages.length,
      chunkCount: chunks.length,
      index: indexStats,
      limits: result.limits,
      pages: result.pages.map((page) => ({
        url: page.url,
        title: page.title,
        depth: page.depth,
        textLength: page.text.length,
      })),
      chunkPreview: chunks.slice(0, 3).map((chunk) => ({
        id: chunk.id,
        url: chunk.url,
        title: chunk.title,
        chunkIndex: chunk.chunkIndex,
        textLength: chunk.text.length,
      })),
      skipped: result.skipped,
      nextStep: "The chunks are now searchable. Use POST /api/chat to test retrieval.",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to crawl website.",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const parsePositiveNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }

  return value;
};
