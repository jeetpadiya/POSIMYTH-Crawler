import type { RequestState } from '../types'

type StatusBlockProps = {
  state: RequestState
  error: string
  idleText: string
  loadingText: string
  successText: string
}

export function StatusBlock({
  state,
  error,
  idleText,
  loadingText,
  successText,
}: StatusBlockProps) {
  const text =
    state === 'loading'
      ? loadingText
      : state === 'success'
        ? successText
        : state === 'error'
          ? error
          : idleText

  const className =
    state === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : state === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-zinc-200 bg-white text-zinc-600'

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${className}`}>
      {text}
    </div>
  )
}
