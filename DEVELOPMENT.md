# Development Journey

## Overview

This was my first time building a web crawler, so I wanted to keep things structured and avoid getting overwhelmed during development. To do that, I broke the entire project down into **9 well-defined phases**, tackling each one sequentially to ensure a clean and manageable implementation.

---

## Tech Stack

| Category   | Technology / Library                            |
| ---------- | ----------------------------------------------- |
| Stack      | Node.js, Express, React (In-Memory Data Store)  |
| Language   | TypeScript (JavaScript)                         |
| Libraries  | `axios`, `cheerio`, `robots-parser`             |
| LLM Engine | Google Gemini 3.5 Flash (free tier, fast)       |
| AI Coding  | OpenAI Codex (used during development)          |

---

## Development Phases

I structured the development into 9 phases to keep things organized and progressively build toward the final product.

### Phase 1 — Backend Skeleton
Set up the core Express + TypeScript backend with the basic project structure and environment configuration.

### Phase 2 — Polite Website Crawler
Implemented the crawler with full respect for `robots.txt` rules and crawl politeness — including request delays, user-agent identification, and disallowed path filtering using `robots-parser`.

### Phase 3 — Content Cleaning
Used `cheerio` to parse and clean raw HTML, stripping out unnecessary tags, scripts, and styles to extract meaningful page content.

### Phase 4 — Chunking
Split the cleaned content into smaller, manageable chunks to prepare it for efficient storage and retrieval during the search and answer phases.

### Phase 5 — Simple Search Store
Built a lightweight storage and indexing layer to persist crawled content chunks and enable basic search functionality.

### Phase 6 — Grounded Answer Engine
Integrated **Google Gemini 1.5 Flash** as the LLM to generate answers grounded in the crawled content, keeping responses relevant and factual to the source material.

### Phase 7 — Chat Controller
Built the chat controller to handle user queries end-to-end — from receiving input, retrieving relevant chunks, and passing context to Gemini, to returning the final response.

### Phase 8 — Minimal Frontend
Developed a clean React + TypeScript frontend to allow users to trigger crawls and interact with the grounded answer engine through a simple chat interface.

### Phase 9 — README
Wrote comprehensive documentation covering setup instructions, architecture overview, and usage guidelines.

---

## Key Principles

- **Crawler Politeness**: Fully respected `robots.txt` directives and implemented request throttling to avoid overloading target servers.
- **Phased Development**: Breaking the project into phases prevented scope creep and made debugging significantly easier.
- **Free-tier LLM**: Chose Gemini 1.5 Flash for its generous free tier and fast response times, making it ideal for a project like this.
- **First-time Crawler**: Despite being a first attempt at building a crawler, the structured phase approach allowed for a clean, functional implementation.
