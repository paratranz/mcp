import test from 'node:test'
import assert from 'node:assert/strict'
import {registerTools} from '../src/tools/index.js'
import {createSerialQueue} from '../src/serial-queue.js'

function createFakeServer() {
  const tools = new Map()
  return {
    tools,
    registerTool(name, config, handler) {
      tools.set(name, {config, handler})
    }
  }
}

function createFakeClient() {
  const calls = []
  const client = {
    calls,
    get: async (path, query) => {
      calls.push({path, query})
      return {ok: true}
    },
    getRedirect: async path => {
      calls.push({path, redirect: true})
      return {status: 302, location: 'https://oss.example.test/archive.zip'}
    },
    put: async (path, body) => {
      calls.push({path, body})
      return {ok: true}
    }
  }
  return client
}

test('registers the full tool set', () => {
  const server = createFakeServer()
  registerTools(server, createFakeClient())

  assert.deepEqual([...server.tools.keys()].sort(), [
    'batch_update_strings',
    'create_issue',
    'create_task',
    'create_term',
    'get_announcement',
    'get_artifact_link',
    'get_file',
    'get_file_content',
    'get_file_strings',
    'get_issue',
    'get_job',
    'get_latest_artifact',
    'get_mt_suggestion',
    'get_project',
    'get_string',
    'get_string_terms',
    'get_suggestions',
    'get_task',
    'get_task_artifact',
    'get_task_artifact_link',
    'get_term',
    'import_file_translation',
    'import_terms',
    'list_announcements',
    'list_file_labels',
    'list_file_revisions',
    'list_files',
    'list_history',
    'list_issues',
    'list_jobs',
    'list_members',
    'list_projects',
    'list_strings',
    'list_tasks',
    'list_term_history',
    'list_terms',
    'operate_file',
    'operate_task',
    'reply_issue',
    'trigger_project_export',
    'trigger_task_export',
    'update_string',
    'update_task',
    'update_task_strings',
    'update_term'
  ])
})

test('list_strings maps tool arguments to API query parameters', async () => {
  const server = createFakeServer()
  const client = createFakeClient()
  registerTools(server, client)

  const {handler} = server.tools.get('list_strings')
  const result = await handler({
    projectId: 1,
    page: 2,
    pageSize: 100,
    detailed: false,
    excludeUid: [7],
    fileLabelExclude: [3],
    wordsLt: 5,
    lengthGt: true,
    filters: {'key@=': 'ui.'}
  })

  assert.equal(result.isError, undefined)
  const {path, query} = client.calls[0]
  assert.equal(path, '/projects/1/strings')
  assert.equal(query.page, 2)
  assert.equal(query.pageSize, 100)
  assert.equal(query.detailed, undefined)
  assert.deepEqual(query['uid!'], [7])
  assert.deepEqual(query['fileLabel!'], [3])
  assert.equal(query['words<'], 5)
  assert.equal(query.lengthGt, '1')
  assert.equal(query['key@='], 'ui.')
})

test('serial queue preserves call order', async () => {
  const serial = createSerialQueue()
  const events = []
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  const first = serial(async () => {
    events.push('first:start')
    await delay(20)
    events.push('first:end')
  })
  const second = serial(async () => {
    events.push('second:start')
  })

  await Promise.all([first, second])
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start'])
})

test('write tools validate required fields', async () => {
  const server = createFakeServer()
  const client = createFakeClient()
  registerTools(server, client)

  const updateString = await server.tools.get('update_string').handler({projectId: 1, stringId: 2})
  assert.equal(updateString.isError, true)
  assert.match(updateString.content[0].text, /at least one field/)

  const importTranslation = await server.tools.get('import_file_translation').handler({
    projectId: 1,
    fileId: 2,
    items: [{key: 'a'}]
  })
  assert.equal(importTranslation.isError, true)
  assert.match(importTranslation.content[0].text, /filename is required/)

  assert.equal(client.calls.length, 0)
})

test('operate_file maps both operations to PUT /files', async () => {
  const server = createFakeServer()
  const client = createFakeClient()
  registerTools(server, client)
  const operateFile = server.tools.get('operate_file').handler

  const renamed = await operateFile({
    projectId: 1,
    op: 'renameFolder',
    source: 'old/path/',
    target: 'new/path/'
  })
  assert.equal(renamed.isError, undefined)
  assert.deepEqual(client.calls[0], {
    path: '/projects/1/files',
    body: {op: 'renameFolder', source: 'old/path/', target: 'new/path/'}
  })

  const merged = await operateFile({projectId: 1, op: 'mergeFiles', source: 2, target: 3, mode: 1})
  assert.equal(merged.isError, undefined)
  assert.deepEqual(client.calls[1], {
    path: '/projects/1/files',
    body: {op: 'mergeFiles', source: 2, target: 3, mode: 1}
  })

  const missingMode = await operateFile({projectId: 1, op: 'mergeFiles', source: 2, target: 3})
  assert.equal(missingMode.isError, true)
  assert.match(missingMode.content[0].text, /mode is required/)

  const wrongSource = await operateFile({projectId: 1, op: 'renameFolder', source: 2, target: 3})
  assert.equal(wrongSource.isError, true)
  assert.match(wrongSource.content[0].text, /directory prefixes/)

  assert.equal(client.calls.length, 2)
})
