import {z} from 'zod'
import {callTool, fileToForm} from './helpers.js'

const projectId = z.number().int().positive().describe('Project ID')
const pos = z.enum(['noun', 'verb', 'adj', 'adv']).optional().describe('Part of speech')
const variants = z.array(z.string()).optional().describe('Other forms of the term')

export function registerTermTools(server, client) {
  server.registerTool('list_terms', {
    title: 'List terms',
    description: 'List project terms with pagination. Use text for fuzzy search across term, ' +
      'translation, variants and note.',
    inputSchema: {
      projectId,
      page: z.number().int().min(1).optional().describe('Page number, default 1'),
      pageSize: z.number().int().min(1).max(1000).optional().describe('Page size, max 1000'),
      text: z.string().optional().describe('Fuzzy search in term, translation, variants and note'),
      term: z.string().optional().describe('Exact match on term'),
      id: z.number().int().positive().optional().describe('Term ID'),
      orderBy: z.string().optional().describe('Order field, default term')
    }
  }, ({projectId, ...query}) => callTool(() => client.get(`/projects/${projectId}/terms`, query)))

  server.registerTool('get_term', {
    title: 'Get term',
    description: 'Get a project term by ID.',
    inputSchema: {
      projectId,
      termId: z.number().int().positive().describe('Term ID')
    }
  }, ({projectId, termId}) => callTool(() => client.get(`/projects/${projectId}/terms/${termId}`)))

  server.registerTool('list_term_history', {
    title: 'List term history',
    description: 'Get the full change history of a term (not paginated). Requires project membership.',
    inputSchema: {
      projectId,
      termId: z.number().int().positive().describe('Term ID')
    }
  }, ({projectId, termId}) => callTool(() =>
    client.get(`/projects/${projectId}/terms/${termId}/history`)))

  server.registerTool('create_term', {
    title: 'Create term',
    description: 'Create a project term. Requires project membership. Fails when the term already ' +
      'exists or the project reached its term limit.',
    inputSchema: {
      projectId,
      term: z.string().describe('Term original text'),
      translation: z.string().describe('Term translation'),
      pos,
      note: z.string().optional().describe('Term note'),
      variants,
      caseSensitive: z.boolean().optional().describe('Whether matching is case sensitive')
    }
  }, ({projectId, ...body}) => callTool(() => client.post(`/projects/${projectId}/terms`, body)))

  server.registerTool('update_term', {
    title: 'Update term',
    description: 'Update a project term. Requires project membership; both term and translation ' +
      'are required by the server.',
    inputSchema: {
      projectId,
      termId: z.number().int().positive().describe('Term ID'),
      term: z.string().describe('Term original text'),
      translation: z.string().describe('Term translation'),
      pos,
      note: z.string().optional().describe('Term note'),
      variants,
      caseSensitive: z.boolean().optional().describe('Whether matching is case sensitive')
    }
  }, ({projectId, termId, ...body}) => callTool(() =>
    client.put(`/projects/${projectId}/terms/${termId}`, body)))

  server.registerTool('import_terms', {
    title: 'Import terms',
    description: 'Import terms from a local JSON or CSV file. Requires manager role or above. ' +
      'Existing terms are updated; set overwrite to delete terms missing from the imported file.',
    inputSchema: {
      projectId,
      filePath: z.string().describe('Local path of a .json or .csv file'),
      overwrite: z.boolean().optional().describe('Delete existing terms missing from the imported file')
    }
  }, ({projectId, filePath, overwrite}) => callTool(async () => {
    const form = await fileToForm(filePath)
    return client.request('PUT', `/projects/${projectId}/terms`, {
      formData: form,
      query: overwrite ? {overwrite: true} : undefined
    })
  }))
}
