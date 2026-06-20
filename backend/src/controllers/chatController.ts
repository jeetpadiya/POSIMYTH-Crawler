import type { Request, Response } from "express";
import { generateGroundedAnswerStream } from "../services/llmEngine.js";
import {
  getIndexStats,
  searchChunks,
  type SearchResult,
} from "../services/vectorStore.js";

const DEFAULT_TOP_K = 5;
const MIN_RELEVANCE_SCORE = 0.25;
const NOT_FOUND_ANSWER = "I couldn't find this in the crawled site.";

export const askQuestion = async (req: Request, res: Response) => {
  const { question, topK } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({
      error: "A question is required.",
    });
  }

  const indexStats = getIndexStats();

  if (indexStats.chunkCount === 0) {
    return res.status(400).json({
      error: "No website has been indexed yet. Please call POST /api/crawl first.",
    });
  }

  const results = searchChunks(
    question,
    parsePositiveNumber(topK) ?? DEFAULT_TOP_K,
  );
  const relevantResults = results.filter(
    (result) => result.score >= MIN_RELEVANCE_SCORE,
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Ensure headers are sent immediately

  if (relevantResults.length === 0) {
    res.write(`data: ${JSON.stringify({ type: "text", text: NOT_FOUND_ANSWER })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done", answer: NOT_FOUND_ANSWER, sources: [] })}\n\n`);
    return res.end();
  }

  try {
    const generator = generateGroundedAnswerStream(question, relevantResults);
    
    for await (const event of generator) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      // @ts-ignore - flush may exist if using compression
      if (typeof res.flush === "function") res.flush();
    }
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })}\n\n`
    );
  } finally {
    res.end();
  }
};

const parsePositiveNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }

  return value;
};

const formatRetrievedChunks = (results: SearchResult[]) =>
  results.map((result) => ({
    score: result.score,
    matchedTerms: result.matchedTerms,
    source: {
      url: result.chunk.url,
      title: result.chunk.title,
      chunkIndex: result.chunk.chunkIndex,
    },
    preview: result.chunk.text.slice(0, 350),
  }));
