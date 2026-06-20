/**
 * Retrieval Eval Runner
 *
 * Crawls a target site, then runs each test case from test-cases.json.
 * For each case it checks whether at least one expected source URL appears
 * in the retrieved chunks and prints a pass/fail summary.
 *
 * Usage:
 *   node --loader ts-node/esm eval/run-eval.ts <url>
 *
 * Example:
 *   node --loader ts-node/esm eval/run-eval.ts https://example.com
 */

import { crawlSite } from "../backend/src/services/crawler.js";
import { chunkPages } from "../backend/src/services/chunker.js";
import { replaceChunks, searchChunks } from "../backend/src/services/vectorStore.js";
import testCases from "./test-cases.json" assert { type: "json" };

const TARGET_URL = process.argv[2];

if (!TARGET_URL) {
  console.error("Usage: node --loader ts-node/esm eval/run-eval.ts <url>");
  process.exit(1);
}

type TestCase = {
  description: string;
  question: string;
  expectedSourceUrls: string[];
};

const TOP_K = 5;

const run = async () => {
  console.log(`\n🔍  Crawling: ${TARGET_URL}`);
  const crawlResult = await crawlSite(TARGET_URL, { maxPages: 20, maxDepth: 2 });
  const chunks = chunkPages(crawlResult.pages);
  replaceChunks(chunks);
  console.log(`✅  Indexed ${chunks.length} chunks from ${crawlResult.pages.length} pages.\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases as TestCase[]) {
    const results = searchChunks(testCase.question, TOP_K);
    const retrievedUrls = results.map((r) => r.chunk.url);

    const hit = testCase.expectedSourceUrls.some((expected) =>
      retrievedUrls.some((retrieved) => retrieved.includes(expected)),
    );

    if (hit) {
      passed++;
      console.log(`  ✅ PASS  "${testCase.description}"`);
    } else {
      failed++;
      console.log(`  ❌ FAIL  "${testCase.description}"`);
      console.log(`     Question        : ${testCase.question}`);
      console.log(`     Expected URLs   : ${testCase.expectedSourceUrls.join(", ")}`);
      console.log(`     Retrieved URLs  : ${retrievedUrls.join(", ") || "(none)"}`);
    }
  }

  const total = passed + failed;
  console.log(`\n📊  Results: ${passed}/${total} passed`);

  if (failed > 0) {
    process.exit(1);
  }
};

run().catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});
