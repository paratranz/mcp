import {z} from 'zod'
import {callTool} from './helpers.js'
import {createSerialQueue} from '../serial-queue.js'

const projectId = z.number().int().positive().describe('Project ID')
const stringId = z.number().int().positive().describe('String ID')
const idList = description => z.array(z.number().int().positive()).optional().describe(description)

const FILTER_OPERATORS = 'Field suffix operators: "=" fuzzy (default), "!=", "@=" prefix, ' +
  '"^=" starts with, "$=" ends with, "~=" regex, "!@=", "!^=", "!$=", "!~=", ">=", "<=". ' +
  'Searchable fields: key, original, translation, context, text, createdAt, updatedAt.'

export function registerStringTools(server, client) {
  const serial = createSerialQueue()

  server.registerTool('list_strings', {
    title: 'List strings',
    description: 'List project strings with pagination and filters. Supports filtering by file, ' +
      'task, stage, editor/translator/reviewer, file label, word count and field operators. ' +
      'Returns page, pageSize, rowCount, pageCount and results.',
    inputSchema: {
      projectId,
      page: z.number().int().min(1).optional().describe('Page number, default 1'),
      pageSize: z.number().int().min(1).max(1000).optional().describe('Page size, max 1000'),
      file: idList('File IDs; returns strings in any of these files'),
      task: z.number().int().positive().optional().describe('Only strings tracked by this task'),
      stage: z.number().int().optional().describe('Filter by stage (0/1/2/3/5/9/-1)'),
      detailed: z.boolean().optional().describe('Include history, comments and file details'),
      uid: z.union([z.array(z.number().int().positive()), z.literal('null')]).optional()
        .describe('Filter by last editor user ID, or "null" for never-edited strings'),
      excludeUid: idList('Exclude strings last edited by these user IDs'),
      filename: z.string().optional().describe('Fuzzy filter by file name; overrides file'),
      fileLabel: idList('Only strings in files of these file label IDs'),
      fileLabelExclude: idList('Exclude strings in files of these file label IDs'),
      translateBy: idList('Only strings translated by these user IDs'),
      translateByExclude: idList('Exclude strings translated by these user IDs'),
      editBy: idList('Only strings edited by these user IDs'),
      editByExclude: idList('Exclude strings edited by these user IDs'),
      reviewBy: idList('Only strings reviewed by these user IDs'),
      reviewByExclude: idList('Exclude strings reviewed by these user IDs'),
      anchor: z.number().int().positive().optional().describe('String ID to locate; requires file and no page'),
      mode: z.number().int().optional().describe('Bitmask: 1 case-insensitive, 4 include hidden strings'),
      id: idList('Only these string IDs'),
      orderBy: z.string().optional().describe('Order field; prefix "-" for descending'),
      words: z.number().int().optional().describe('Only strings with word count >= this value'),
      wordsLt: z.number().int().optional().describe('Only strings with word count < this value'),
      lengthGt: z.union([z.boolean(), z.literal('char')]).optional()
        .describe('Only strings whose translation is longer than the original; "char" compares characters'),
      filters: z.record(z.string(), z.string()).optional()
        .describe(`Field-operator filters, e.g. {"key@=": "ui.", "translation~=": "^[A-Z]"}. ${FILTER_OPERATORS}`)
    }
  }, ({projectId, detailed, excludeUid, fileLabelExclude, translateByExclude, editByExclude, reviewByExclude,
    wordsLt, lengthGt, filters, ...rest}) => callTool(() => {
    const query = {...rest, ...filters}
    if (detailed) {
      query.detailed = 1
    }
    if (excludeUid) {
      query['uid!'] = excludeUid
    }
    if (fileLabelExclude) {
      query['fileLabel!'] = fileLabelExclude
    }
    if (translateByExclude) {
      query['translateBy!'] = translateByExclude
    }
    if (editByExclude) {
      query['editBy!'] = editByExclude
    }
    if (reviewByExclude) {
      query['reviewBy!'] = reviewByExclude
    }
    if (wordsLt !== undefined) {
      query['words<'] = wordsLt
    }
    if (lengthGt === 'char' || lengthGt === true) {
      query.lengthGt = lengthGt === 'char' ? 'char' : '1'
    }
    return client.get(`/projects/${projectId}/strings`, query)
  }))

  server.registerTool('get_string', {
    title: 'Get string',
    description: 'Get a single string with file details, history and comments.',
    inputSchema: {projectId, stringId}
  }, ({projectId, stringId}) => callTool(() =>
    client.get(`/projects/${projectId}/strings/${stringId}`)))

  server.registerTool('list_history', {
    title: 'List history',
    description: 'List project history. type defaults to string history (translate/edit/check/review); ' +
      'term/import/comment return term, import and comment history. Time filters use begin/end. ' +
      'tid disables pagination and supports multiple string IDs.',
    inputSchema: {
      projectId,
      page: z.number().int().min(1).optional().describe('Page number'),
      pageSize: z.number().int().min(1).max(1000).optional().describe('Page size, max 1000'),
      type: z.enum(['translate', 'edit', 'check', 'review', 'term', 'import', 'comment']).optional()
        .describe('History type; omit for string history'),
      tid: z.union([z.number().int().positive(), z.array(z.number().int().positive())]).optional()
        .describe('String ID(s); returns all history of these strings and disables pagination'),
      uid: z.number().int().positive().optional().describe('User ID, only effective for type=comment'),
      begin: z.string().optional().describe('Only records at/after this ISO datetime'),
      end: z.string().optional().describe('Only records before this ISO datetime'),
      keyword: z.string().optional().describe('Fuzzy search on from/to content; string history only'),
      orderBy: z.string().optional().describe('Order field; prefix "-" for descending')
    }
  }, ({projectId, ...query}) => callTool(() => client.get(`/projects/${projectId}/history`, query)))

  server.registerTool('get_suggestions', {
    title: 'Get translation suggestions',
    description: 'Get translation memory suggestions for a string from Elasticsearch. ' +
      'This endpoint is expensive: requests are serialized by this MCP server, do not ' +
      'poll in parallel and avoid force=true. Returns up to 30 suggestions with matching scores.',
    inputSchema: {
      projectId,
      stringId,
      scope: z.enum(['self', 'my', 'all']).optional().describe('Source scope, default self'),
      rate: z.number().int().min(0).max(100).optional().describe('Minimum match rate (0-100), default 70'),
      ignore: z.string().optional().describe('Project IDs to ignore, separated by non-digit characters'),
      force: z.boolean().optional().describe('Bypass caches, for troubleshooting only')
    }
  }, ({projectId, stringId, ...query}) => callTool(() =>
    serial(() => client.get(`/projects/${projectId}/strings/${stringId}/suggestions`, query))))

  server.registerTool('get_string_terms', {
    title: 'Get matched terms',
    description: 'Get project terms matched in a string original text, ordered by term length.',
    inputSchema: {
      projectId,
      stringId,
      force: z.boolean().optional().describe('Rebuild the term cache, for troubleshooting only')
    }
  }, ({projectId, stringId, ...query}) => callTool(() =>
    client.get(`/projects/${projectId}/strings/${stringId}/terms`, query)))

  server.registerTool('get_mt_suggestion', {
    title: 'Get machine translation',
    description: 'Translate a string original with a machine translation service. ' +
      'Credentials are passed per call and are not stored. Cached for 7 days.',
    inputSchema: {
      projectId,
      stringId,
      service: z.enum(['google', 'youdao', 'baidu', 'deepl']).optional().describe('MT service, default google'),
      apiKey: z.string().optional().describe('API key for google/deepl'),
      appKey: z.string().optional().describe('App ID for youdao/baidu'),
      appSecret: z.string().optional().describe('App secret for youdao/baidu'),
      model: z.string().optional().describe('Model parameter for some services'),
      isPro: z.boolean().optional().describe('Use the Pro endpoint for deepl'),
      action: z.string().optional().describe('Optional action parameter for baidu'),
      force: z.boolean().optional().describe('Bypass the cache')
    }
  }, ({projectId, stringId, ...query}) => callTool(() =>
    client.get(`/projects/${projectId}/strings/${stringId}/suggestions/mt`, query)))

  server.registerTool('update_string', {
    title: 'Update string',
    description: 'Update a single string. Requires translator role or above. ' +
      'Changing key/original/context, hiding or locking a string requires manager. ' +
      'Pass fileId to move the string to another file of the same project.',
    inputSchema: {
      projectId,
      stringId,
      translation: z.string().optional().describe('Translation text; empty string marks the string untranslated'),
      stage: z.number().int().optional().describe('Target stage (0/1/2/3/5/9/-1)'),
      context: z.string().optional().describe('String context; manager only'),
      key: z.string().optional().describe('String key; manager only'),
      original: z.string().optional().describe('Original text; manager only'),
      fileId: z.number().int().positive().optional().describe('Move the string to this file')
    }
  }, ({projectId, stringId, ...raw}) => callTool(() => {
    const body = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined))
    if (!Object.keys(body).length) {
      throw new Error('Provide at least one field to update')
    }
    return client.put(`/projects/${projectId}/strings/${stringId}`, body)
  }))

  server.registerTool('batch_update_strings', {
    title: 'Batch update strings',
    description: 'Batch update up to 1000 strings in one request. Requires translator role or above. ' +
      'Changing key/original/context requires manager; marking strings as checked/reviewed or ' +
      'editing checked strings requires reviewer role. Deletion is not exposed.',
    inputSchema: {
      projectId,
      items: z.array(z.object({
        id: z.number().int().positive().describe('String ID'),
        translation: z.string().optional().describe('Translation text'),
        stage: z.number().int().optional().describe('Target stage'),
        key: z.string().optional().describe('String key; manager only'),
        original: z.string().optional().describe('Original text; manager only'),
        context: z.string().optional().describe('String context; manager only')
      })).min(1).max(1000).describe('Strings to update')
    }
  }, ({projectId, items}) => callTool(() =>
    client.put(`/projects/${projectId}/strings`, {op: 'edit', items})))
}
