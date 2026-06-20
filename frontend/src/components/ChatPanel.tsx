import type { FormEvent } from 'react'
import { StatusBlock } from './StatusBlock'
import type { ChatResponse, RequestState } from '../types'

type ChatPanelProps = {
  question: string
  result: ChatResponse | null
  state: RequestState
  error: string
  isReady: boolean
  onQuestionChange: (question: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ChatPanel({
  question,
  result,
  state,
  error,
  isReady,
  onQuestionChange,
  onSubmit,
}: ChatPanelProps) {
  const canAsk = isReady && question.trim().length > 0

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">2. Ask</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Questions are answered only from the indexed text.
        </p>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="question">
          Question
        </label>
        <textarea
          id="question"
          className="min-h-28 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          placeholder="Ask something from the crawled site..."
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          required
        />
        <button
          className="min-h-11 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          type="submit"
          disabled={!canAsk || state === 'loading'}
        >
          {state === 'loading' ? 'Asking...' : 'Ask'}
        </button>
      </form>

      <StatusBlock
        state={state}
        error={error}
        idleText={isReady ? 'Ready for a question.' : 'Crawl a site before asking.'}
        loadingText="Searching the index and generating an answer."
        successText="Answer ready."
      />

      {result ? (
        <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Answer</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
              {result.answer}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Sources</h3>
            {result.sources.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {result.sources.map((source) => (
                  <li key={`${source.url}-${source.chunkIndex}`}>
                    <a
                      className="break-words text-sm text-zinc-800 underline underline-offset-4 hover:text-zinc-950"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title || source.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No sources returned.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
