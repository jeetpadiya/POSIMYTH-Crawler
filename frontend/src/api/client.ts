const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

export async function postJson<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(getApiError(data))
  }

  return data as TResponse
}

function getApiError(data: unknown) {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = data.error

    if (typeof error === 'string') {
      return error
    }
  }

  return 'Request failed.'
}
