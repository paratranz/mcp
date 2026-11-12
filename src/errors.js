const STATUS_HINTS = {
  400: 'Request parameters are invalid',
  401: 'PARATRANZ_TOKEN is invalid or expired',
  403: 'The token user has no permission for this operation',
  404: 'Resource not found or not accessible',
  423: 'The file is being updated by another user, retry later',
  429: 'Rate limit exceeded, slow down and retry later',
  500: 'Server error, retry later',
  502: 'Bad gateway, retry later',
  503: 'Service unavailable, retry later',
  504: 'Gateway timeout, retry later'
}

export class ApiError extends Error {
  constructor(message, {status, code, requestId, hint} = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.hint = hint || STATUS_HINTS[status]
  }
}

export function formatError(err) {
  if (err instanceof ApiError) {
    const lines = [`HTTP ${err.status}: ${err.message}`]
    if (err.code) {
      lines.push(`code: ${err.code}`)
    }
    if (err.requestId) {
      lines.push(`request id: ${err.requestId}`)
    }
    if (err.hint) {
      lines.push(err.hint)
    }
    return lines.join('\n')
  }
  const cause = err?.cause?.code || err?.cause?.message
  return cause ? `${err.message} (${cause})` : (err?.message || String(err))
}
