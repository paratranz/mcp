import {ApiError} from './errors.js'

const DEFAULT_TIMEOUT = 60000

export class ParatranzClient {
  #baseUrl
  #token
  #timeoutMs
  #fetch

  constructor({baseUrl, token, timeoutMs = DEFAULT_TIMEOUT, fetchImpl = globalThis.fetch}) {
    this.#baseUrl = String(baseUrl).replace(/\/+$/, '')
    this.#token = token
    this.#timeoutMs = timeoutMs
    this.#fetch = fetchImpl
  }

  #buildUrl(path, query) {
    const url = new URL(this.#baseUrl + path)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
          continue
        }
        for (const item of Array.isArray(value) ? value : [value]) {
          url.searchParams.append(key, String(item))
        }
      }
    }
    return url
  }

  async request(method, path, {query, body, formData, redirect = 'follow'} = {}) {
    const headers = {
      Authorization: `Bearer ${this.#token}`
    }

    let payload
    if (formData) {
      payload = formData
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    const response = await this.#fetch(this.#buildUrl(path, query), {
      method,
      headers,
      body: payload,
      redirect,
      signal: AbortSignal.timeout(this.#timeoutMs)
    })

    if (redirect === 'manual' && response.status >= 300 && response.status < 400) {
      return {status: response.status, location: response.headers.get('location')}
    }

    if (!response.ok) {
      const error = await this.#parseError(response)
      throw error
    }

    if (response.status === 204) {
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }
    return response.text()
  }

  async #parseError(response) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      // 非 JSON 错误体，使用状态码文案
    }
    const message = payload?.message || response.statusText || 'Request failed'
    return new ApiError(message, {
      status: response.status,
      code: payload?.code,
      requestId: payload?.id
    })
  }

  get(path, query) {
    return this.request('GET', path, {query})
  }

  post(path, body, query) {
    return this.request('POST', path, {body, query})
  }

  put(path, body, query) {
    return this.request('PUT', path, {body, query})
  }

  delete(path, query) {
    return this.request('DELETE', path, {query})
  }

  getRedirect(path, query) {
    return this.request('GET', path, {query, redirect: 'manual'})
  }

  postForm(path, formData, query) {
    return this.request('POST', path, {formData, query})
  }
}
