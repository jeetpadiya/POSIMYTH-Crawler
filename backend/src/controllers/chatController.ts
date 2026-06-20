import type { Request, Response } from "express";
import { generateGroundedAnswer } from "../services/llmEngine.js";
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

  if (relevantResults.length === 0) {
    return res.json({
      answer: NOT_FOUND_ANSWER,
      question,
      sources: [],
      index: indexStats,
      retrievedChunks: formatRetrievedChunks(results),
    });
  }

  try {
    const groundedAnswer = await generateGroundedAnswer(
      question,
      relevantResults,
    );

    return res.json({
      answer: groundedAnswer.answer,
      question,
      sources: groundedAnswer.sources,
      modelUsed: groundedAnswer.modelUsed,
      index: indexStats,
      retrievedChunks: formatRetrievedChunks(relevantResults),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate an answer.",
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
