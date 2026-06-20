import type { FormEvent } from 'react'
import { StatusBlock } from './StatusBlock'
import type { ChatMessage, RequestState } from '../types'

type ChatPanelProps = {
  question: string
  history: ChatMessage[]
  state: RequestState
  error: string
  isReady: boolean
  onQuestionChange: (question: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClear: () => void
}

export function ChatPanel({
  question,
  history,
  state,
  error,
  isReady,
  onQuestionChange,
  onSubmit,
  onClear,
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

      {history.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Conversation history
            </p>
            <button
              type="button"
              onClick={onClear}
              className="rounded px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            >
              Clear history
            </button>
          </div>
          {history.map((message, index) => (
            <div
              key={index}
              className="space-y-4 rounded-md border border-zinc-200 bg-white p-4"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Question
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800">
                  {message.question}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Answer
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                  {message.response.answer}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Sources
                </p>
                {message.response.sources.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {message.response.sources.map((source) => (
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
          ))}
        </div>
      )}
    </section>
  )
}
