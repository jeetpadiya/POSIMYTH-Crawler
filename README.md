# POSIMYTH Crawler

A small "chat with a website" app. The backend has two workflows: first it crawls and indexes a website, then it answers questions using that index.

The project is intentionally scoped to one site at a time. The interesting part is the retrieval pipeline: polite crawling, text cleaning, chunking, simple retrieval, and grounded answers with source links.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Crawling: Axios, Cheerio, robots-parser
- Search store: in-memory lexical search
- LLM: OpenAI-compatible chat completion API, tested with Gemini

## How To Run

Install backend dependencies:

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-3.5-flash
```

`MONGO_URI` is optional. The current app does not require MongoDB for indexing because the search store is in memory.

Start the backend:

```bash
cd backend
npm run dev
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal. The frontend expects the backend at `http://localhost:5000` by default.

If your backend runs somewhere else, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## API

Health check:

```http
GET /api/health
```

Crawl and index a site:

```http
POST /api/crawl
Content-Type: application/json

{
  "url": "https://example.com",
  "maxPages": 20,
  "maxDepth": 2
}
```

Ask a question:

```http
POST /api/chat
Content-Type: application/json

{
  "question": "example domain",
  "topK": 5
}
```

## Architecture

The app follows a simple RAG pipeline:

1. The user submits a website URL.
2. The backend crawls pages from the same hostname.
3. The crawler extracts and cleans readable page text.
4. Pages are split into overlapping chunks.
5. Chunks are stored in an in-memory search index.
6. The chat endpoint searches the index before calling the LLM.
7. The LLM receives only retrieved chunks as context.
8. The API returns the answer plus source URLs from the retrieved chunks.

Important files:

- `backend/src/services/crawler.ts` - website crawling, robots.txt, link extraction, text cleanup
- `backend/src/services/chunker.ts` - page-to-chunk splitting
- `backend/src/services/vectorStore.ts` - simple in-memory lexical search
- `backend/src/services/llmEngine.ts` - grounded prompt and LLM call
- `backend/src/controllers/crawlController.ts` - crawl workflow
- `backend/src/controllers/chatController.ts` - retrieval-first chat workflow
- `frontend/src/pages/HomePage.tsx` - frontend state and API flow

## Crawling Strategy

I intentionally limited the crawler so it stays safe and predictable. It only crawls pages from the original domain and uses page/depth limits.

Current defaults:

- Max pages: `20`
- Max depth: `2`
- Delay between requests: at least `750ms`
- Same hostname only
- `robots.txt` respected
- Non-HTML responses skipped
- Failed pages are reported in the crawl response

The crawler does not render JavaScript. It fetches HTML directly and parses links from `a[href]` elements.

## Content Cleaning

Retrieval quality depends heavily on clean text. The crawler removes common layout and non-content elements before reading body text:

- `script`
- `style`
- `noscript`
- `svg`
- `nav`
- `footer`
- `header`
- `form`

Whitespace is normalized, and pages with too little text are skipped. This helps prevent repeated navigation/footer content from dominating the index.

## Chunking Strategy

The LLM should not receive whole pages. Pages are split into focused overlapping chunks so retrieval can return smaller evidence.

Current defaults:

- Chunk size: `900` characters
- Chunk overlap: `180` characters
- Minimum chunk length: `80` characters

Each chunk stores metadata:

- Source URL
- Page title
- Chunk index
- Crawl depth

## Retrieval Strategy

The file is named `vectorStore.ts`, but the current implementation is intentionally a simple in-memory lexical search store.

For this assignment, I used word-overlap scoring to keep the system small and explainable:

1. Tokenize the question.
2. Remove short/common terms.
3. Score each chunk by matching query terms against title and chunk text.
4. Return the top results.
5. The chat controller filters out weak matches before calling the LLM.

For production, I would replace this with embeddings plus pgvector or a vector database.

## Grounding Strategy

Retrieval decides what evidence the model is allowed to see. The model is instructed to answer only from that evidence and cite source URLs.

The backend also returns source links from the retrieved chunks even if the model forgets to cite them in the answer text.

If retrieval finds no relevant chunks, the chat endpoint returns:

```text
I couldn't find this in the crawled site.
```

In that case, the backend does not ask the model to guess.

## Frontend

The frontend is intentionally minimal because the assignment evaluates the crawl, chunking, retrieval, and grounding pipeline.

The UI includes only:

- URL input
- Crawl button
- Crawl status
- Question input
- Answer output
- Source links

## Limitations

- The index is in memory, so restarting the backend clears crawled data.
- Only one website index is active at a time.
- The crawler does not render JavaScript-heavy pages.
- Retrieval is lexical, so it may miss semantically related answers that use different wording.
- Long pages can produce many chunks, but ranking is still simple word overlap.
- The crawler handles basic politeness but is not a production-grade crawler.
- No authentication, persistence, or multi-user isolation.

## Future Improvements

- Replace lexical search with embeddings and pgvector.
- Persist crawl sessions and chunks in a database.
- Add a small retrieval eval set with expected source pages.
- Add JavaScript rendering with Playwright for dynamic sites.
- Add better boilerplate removal for cookie banners and repeated sidebars.
- Add streaming answers in the frontend.
- Add per-site crawl sessions instead of replacing the global index.
- Improve ranking with BM25 or hybrid lexical/vector search.

## Notes For Review

The design favors a smaller, explainable solution over a large crawler. The app can crawl a simple website, index its cleaned text, retrieve relevant chunks, and generate grounded answers with source links.
