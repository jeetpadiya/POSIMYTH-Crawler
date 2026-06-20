import axios from "axios";
import { load } from "cheerio";
import robotsParserModule from "robots-parser";

const USER_AGENT = "POSIMYTH-Crawler/1.0";
const DEFAULT_MAX_PAGES = 20;
const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_DELAY_MS = 750;
const MAX_DELAY_MS = 5000;
const MIN_TEXT_LENGTH = 100;

export type CrawledPage = {
  url: string;
  title: string;
  text: string;
  depth: number;
};

export type CrawlOptions = {
  maxPages?: number;
  maxDepth?: number;
};

export type CrawlResult = {
  startUrl: string;
  pages: CrawledPage[];
  skipped: {
    robotsBlocked: string[];
    nonHtml: string[];
    failed: Array<{ url: string; reason: string }>;
  };
  limits: {
    maxPages: number;
    maxDepth: number;
    delayMs: number;
  };
};

type QueueItem = {
  url: string;
  depth: number;
};

type RobotsRules = {
  isAllowed: (url: string, userAgent?: string) => boolean | undefined;
  getCrawlDelay: (userAgent?: string) => number | undefined;
};

type RobotsParser = (robotsUrl: string, robotsText: string) => RobotsRules;

const robotsParser = robotsParserModule as unknown as RobotsParser;

export const crawlSite = async (
  startUrl: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> => {
  const normalizedStartUrl = normalizeUrl(startUrl);
  const origin = new URL(normalizedStartUrl).origin;
  const hostname = new URL(normalizedStartUrl).hostname;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const robots = await loadRobots(origin);
  const robotsDelay = robots.getCrawlDelay(USER_AGENT);
  const rawDelay = Math.max(DEFAULT_DELAY_MS, (robotsDelay ?? 0) * 1000);
  const delayMs = Math.min(rawDelay, MAX_DELAY_MS);

  if (rawDelay > MAX_DELAY_MS) {
    console.warn(
      `[crawler] robots.txt Crawl-Delay is ${robotsDelay}s — capped to ${MAX_DELAY_MS / 1000}s to keep the app responsive.`,
    );
  }

  const queue: QueueItem[] = [{ url: normalizedStartUrl, depth: 0 }];
  const seen = new Set<string>();
  const queued = new Set<string>([normalizedStartUrl]);
  const pages: CrawledPage[] = [];
  const skipped: CrawlResult["skipped"] = {
    robotsBlocked: [],
    nonHtml: [],
    failed: [],
  };

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift();

    if (!current || seen.has(current.url)) {
      continue;
    }

    queued.delete(current.url);
    seen.add(current.url);

    const allowed = robots.isAllowed(current.url, USER_AGENT);
    if (allowed === false) {
      skipped.robotsBlocked.push(current.url);
      continue;
    }

    await wait(delayMs);

    const fetched = await fetchHtml(current.url);
    if (!fetched.ok) {
      skipped.failed.push({ url: current.url, reason: fetched.reason });
      continue;
    }

    if (!fetched.isHtml) {
      skipped.nonHtml.push(current.url);
      continue;
    }

    const { title, text, links } = parsePage(fetched.html, current.url);

    if (text.length >= MIN_TEXT_LENGTH) {
      pages.push({
        url: current.url,
        title,
        text,
        depth: current.depth,
      });
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const link of links) {
      const normalizedLink = normalizeLink(link, current.url, hostname);

      if (
        !normalizedLink ||
        seen.has(normalizedLink) ||
        queued.has(normalizedLink)
      ) {
        continue;
      }

      queued.add(normalizedLink);
      queue.push({
        url: normalizedLink,
        depth: current.depth + 1,
      });
    }
  }

  return {
    startUrl: normalizedStartUrl,
    pages,
    skipped,
    limits: {
      maxPages,
      maxDepth,
      delayMs,
    },
  };
};

const loadRobots = async (origin: string) => {
  const robotsUrl = `${origin}/robots.txt`;

  try {
    const response = await axios.get<string>(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 5000,
    });

    return robotsParser(robotsUrl, response.data);
  } catch {
    return robotsParser(robotsUrl, "");
  }
};

const fetchHtml = async (
  url: string,
): Promise<
  | { ok: true; html: string; isHtml: boolean }
  | { ok: false; reason: string }
> => {
  try {
    const response = await axios.get<string>(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
      maxRedirects: 5,
      responseType: "text",
    });

    const contentType = String(response.headers["content-type"] ?? "");
    const isHtml = contentType.includes("text/html");

    return {
      ok: true,
      html: response.data,
      isHtml,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        ok: false,
        reason: error.response
          ? `HTTP ${error.response.status}`
          : error.message,
      };
    }

    return {
      ok: false,
      reason: "Unknown fetch error",
    };
  }
};

const parsePage = (html: string, pageUrl: string) => {
  const $ = load(html);

  $("script, style, noscript, svg, nav, footer, header, form").remove();

  const title = cleanText($("title").first().text()) || pageUrl;
  const text = cleanText($("body").text());
  const links = $("a[href]")
    .map((_, element) => $(element).attr("href"))
    .get()
    .filter((href): href is string => Boolean(href));

  return { title, text, links };
};

const normalizeLink = (
  href: string,
  baseUrl: string,
  allowedHostname: string,
) => {
  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return null;
  }

  try {
    const url = new URL(href, baseUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (url.hostname !== allowedHostname) {
      return null;
    }

    return normalizeUrl(url.toString());
  } catch {
    return null;
  }
};

const normalizeUrl = (url: string) => {
  const parsed = new URL(url);
  parsed.hash = "";

  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
};

const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
