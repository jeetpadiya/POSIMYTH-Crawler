import { useState } from 'react'
import type { FormEvent } from 'react'
import { postJson } from '../api/client'
import { ChatPanel } from '../components/ChatPanel'
import { CrawlPanel } from '../components/CrawlPanel'
import type { ChatMessage, ChatResponse, CrawlResponse, RequestState } from '../types'

export function HomePage() {
  const [url, setUrl] = useState('https://example.com')
  const [question, setQuestion] = useState('')
  const [crawlState, setCrawlState] = useState<RequestState>('idle')
  const [chatState, setChatState] = useState<RequestState>('idle')
  const [crawlResult, setCrawlResult] = useState<CrawlResponse | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [crawlError, setCrawlError] = useState('')
  const [chatError, setChatError] = useState('')

  const crawlWebsite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCrawlState('loading')
    setCrawlError('')
    setChatHistory([])

    try {
      const data = await postJson<CrawlResponse>('/api/crawl', {
        url: url.trim(),
        maxPages: 20,
        maxDepth: 2,
      })

      setCrawlResult(data)
      setCrawlState('success')
    } catch (error) {
      setCrawlResult(null)
      setCrawlError(getErrorMessage(error))
      setCrawlState('error')
    }
  }

  const askQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setChatState('loading')
    setChatError('')

    const currentQuestion = question.trim()

    try {
      const data = await postJson<ChatResponse>('/api/chat', {
        question: currentQuestion,
        topK: 5,
      })

      setChatHistory((prev) => [...prev, { question: currentQuestion, response: data }])
      setQuestion('')
      setChatState('success')
    } catch (error) {
      setChatError(getErrorMessage(error))
      setChatState('error')
    }
  }

  const clearHistory = () => {
    setChatHistory([])
    setChatState('idle')
    setChatError('')
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-6 sm:py-10">
      <header className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-medium text-zinc-500">Website Q&A</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
          Crawl a site, then ask about it
        </h1>
      </header>

      <CrawlPanel
        url={url}
        result={crawlResult}
        state={crawlState}
        error={crawlError}
        onUrlChange={setUrl}
        onSubmit={crawlWebsite}
      />

      <ChatPanel
        question={question}
        history={chatHistory}
        state={chatState}
        error={chatError}
        isReady={crawlResult !== null}
        onQuestionChange={setQuestion}
        onSubmit={askQuestion}
        onClear={clearHistory}
      />
    </div>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.'
}
