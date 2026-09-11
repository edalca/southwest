type FrappeError = {
  _error_message?: unknown
  _server_messages?: unknown
  message?: unknown
}

export function userErrorMessage(error: unknown, fallback: string): string {
  const frappeError = error as FrappeError | null | undefined
  const serverMessages = extractMessages(frappeError?._server_messages)
  const candidates = [
    ...serverMessages,
    frappeError?._error_message,
    frappeError?.message,
  ]

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const cleaned = cleanMessage(candidate)
    if (cleaned) return cleaned
  }
  return fallback
}

function extractMessages(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap(extractMessages)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return extractMessages(record.message ?? record.msg)
  }
  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    return extractMessages(JSON.parse(trimmed))
  } catch {
    return [trimmed]
  }
}

function cleanMessage(value: string): string {
  let message = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

  let previous = ''
  while (message && message !== previous) {
    previous = message
    message = message
      .replace(/^Error:\s*/i, '')
      .replace(/^(?:frappe\.)?[\w.]*?(?:Error|Exception):?\s*/i, '')
      .trim()
  }
  return message
}
