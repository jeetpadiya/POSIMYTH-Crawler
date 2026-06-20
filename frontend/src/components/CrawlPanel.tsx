import type { FormEvent } from 'react'
import { StatusBlock } from './StatusBlock'
import type { CrawlResponse, RequestState } from '../types'

type CrawlPanelProps = {
  url: string
  result: CrawlResponse | null
  state: RequestState
  error: string
  onUrlChange: (url: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CrawlPanel({
  url,
  result,
  state,
  error,
  onUrlChange,
  onSubmit,
}: CrawlPanelProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">1. Crawl</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Index up to 20 pages from one domain.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="site-url">
          Website URL
        </label>
        <input
          id="site-url"
          className="min-h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          placeholder="https://example.com"
          type="url"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          required
        />
        <button
          className="min-h-11 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          type="submit"
          disabled={state === 'loading'}
        >
          {state === 'loading' ? 'Crawling...' : 'Crawl'}
        </button>
      </form>

      <StatusBlock
        state={state}
        error={error}
        idleText="No site indexed yet."
        loadingText="Fetching pages and building the index."
        successText={
          result
            ? `${result.pageCount} pages indexed into ${result.chunkCount} chunks.`
            : ''
        }
      />

      {result && result.pages.length > 0 ? (
        <div className="rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium">
            Indexed pages
          </div>
          <ul className="divide-y divide-zinc-100">
            {result.pages.slice(0, 5).map((page) => (
              <li className="px-4 py-3" key={page.url}>
                <a
                  className="block truncate text-sm font-medium text-zinc-950 underline-offset-4 hover:underline"
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {page.title || page.url}
                </a>
                <p className="mt-1 text-xs text-zinc-500">
                  Depth {page.depth} - {page.textLength} characters
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
