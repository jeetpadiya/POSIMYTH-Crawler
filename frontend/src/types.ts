export type CrawlPage = {
  url: string
  title: string
  depth: number
  textLength: number
}

export type CrawlResponse = {
  message: string
  pageCount: number
  chunkCount: number
  pages: CrawlPage[]
}

export type Source = {
  url: string
  title: string
  chunkIndex: number
}

export type ChatResponse = {
  answer: string
  sources: Source[]
}

export type RequestState = 'idle' | 'loading' | 'success' | 'error'
