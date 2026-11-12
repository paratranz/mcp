import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {ParatranzClient} from '../src/client.js'
import {ApiError, formatError} from '../src/errors.js'

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json'}
})

test('builds repeated query params, auth header and parses JSON', async () => {
  let captured
  const client = new ParatranzClient({
    baseUrl: 'https://example.test/api/',
    token: 'abc',
    fetchImpl: async (url, init) => {
      captured = {url, init}
      return jsonResponse({ok: true})
    }
  })

  const data = await client.get('/strings', {file: [1, 2], stage: 1, skip: undefined})

  assert.deepEqual(data, {ok: true})
  const url = new URL(captured.url)
  assert.equal(url.pathname, '/api/strings')
  assert.deepEqual(url.searchParams.getAll('file'), ['1', '2'])
  assert.equal(url.searchParams.get('stage'), '1')
  assert.equal(url.searchParams.has('skip'), false)
  assert.equal(captured.init.headers.Authorization, 'Bearer abc')
})

test('throws ApiError with server message and request id', async () => {
  const client = new ParatranzClient({
    baseUrl: 'https://example.test/api',
    token: 'abc',
    fetchImpl: async () => jsonResponse({message: '项目未开启任务功能', code: 'FORBIDDEN', id: '8f3a1b2c'}, 403)
  })

  await assert.rejects(() => client.get('/projects/1/tasks'), err => {
    assert.ok(err instanceof ApiError)
    assert.equal(err.status, 403)
    const text = formatError(err)
    assert.match(text, /HTTP 403/)
    assert.match(text, /项目未开启任务功能/)
    assert.match(text, /request id: 8f3a1b2c/)
    return true
  })
})

test('keeps 302 location for manual redirects', async () => {
  const client = new ParatranzClient({
    baseUrl: 'https://example.test/api',
    token: 'abc',
    fetchImpl: async () => new Response(null, {
      status: 302,
      headers: {location: 'https://oss.example.test/archive.zip'}
    })
  })

  const result = await client.getRedirect('/projects/1/artifacts/download')

  assert.deepEqual(result, {
    status: 302,
    location: 'https://oss.example.test/archive.zip'
  })
})

test('exits with an error when PARATRANZ_TOKEN is missing', () => {
  const entry = fileURLToPath(new URL('../src/index.js', import.meta.url))
  const result = spawnSync(process.execPath, [entry], {
    encoding: 'utf8',
    timeout: 10000,
    env: {...process.env, PARATRANZ_TOKEN: ''}
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /PARATRANZ_TOKEN is required/)
})
