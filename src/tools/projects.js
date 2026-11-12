import {z} from 'zod'
import {callTool} from './helpers.js'

const pageSchema = z.number().int().min(1).optional()
const pageSizeSchema = z.number().int().min(1).max(1000).optional()

export function registerProjectTools(server, client) {
  server.registerTool('list_projects', {
    title: 'List projects',
    description: 'List ParaTranz projects with optional filters. Returns a paginated result. ' +
      'Private projects are only visible to members unless a filter is provided.',
    inputSchema: {
      page: pageSchema.describe('Page number, default 1'),
      pageSize: pageSizeSchema.describe('Page size, default 24, max 1000'),
      game: z.string().optional().describe('Filter by game/file format'),
      uid: z.number().int().positive().optional().describe('Filter by member user ID'),
      stage: z.number().int().optional().describe('Filter by project stage'),
      public: z.boolean().optional().describe('Only projects allowing direct join'),
      filter: z.string().max(100).optional().describe('Fuzzy search by project name, max 100 chars'),
      source: z.string().optional().describe('Filter by source language'),
      target: z.string().optional().describe('Filter by target language')
    }
  }, args => callTool(() => client.get('/projects', args)))

  server.registerTool('get_project', {
    title: 'Get project',
    description: 'Get a ParaTranz project by ID, including counts, settings and the current ' +
      'string/file statistics.',
    inputSchema: {
      projectId: z.number().int().positive().describe('Project ID')
    }
  }, ({projectId}) => callTool(() => client.get(`/projects/${projectId}`)))

  server.registerTool('list_files', {
    title: 'List files',
    description: 'List all files of a project (not paginated).',
    inputSchema: {
      projectId: z.number().int().positive().describe('Project ID'),
      orderBy: z.string().optional().describe('Order field, default name'),
      name: z.string().optional().describe('Fuzzy filter by file name'),
      size: z.number().int().positive().optional().describe('Limit the number of files'),
      list: z.boolean().optional().describe('Return lightweight file info'),
      task: z.number().int().positive().optional().describe('Only files linked to this task'),
      modifiedAt: z.string().optional().describe('Only files modified after this ISO datetime'),
      createdAt: z.string().optional().describe('Only files created after this ISO datetime')
    }
  }, ({projectId, ...query}) => callTool(() => client.get(`/projects/${projectId}/files`, query)))

  server.registerTool('get_file', {
    title: 'Get file',
    description: 'Get file metadata by ID.',
    inputSchema: {
      projectId: z.number().int().positive().describe('Project ID'),
      fileId: z.number().int().positive().describe('File ID')
    }
  }, ({projectId, fileId}) => callTool(() => client.get(`/projects/${projectId}/files/${fileId}`)))

  server.registerTool('get_file_strings', {
    title: 'Get file strings',
    description: 'Get every string of a file (original and translation) in one response. ' +
      'May be large; prefer list_strings with pagination for big files.',
    inputSchema: {
      projectId: z.number().int().positive().describe('Project ID'),
      fileId: z.number().int().positive().describe('File ID')
    }
  }, ({projectId, fileId}) => callTool(() => client.get(`/projects/${projectId}/files/${fileId}/translation`)))

  server.registerTool('trigger_project_export', {
    title: 'Trigger project export',
    description: 'Trigger a full project export (buildProject job). Requires manager role or above. ' +
      'Returns a job; poll it with get_job and fetch the archive with get_artifact_link.',
    inputSchema: {
      projectId: z.number().int().positive().describe('Project ID')
    }
  }, ({projectId}) => callTool(() => client.post(`/projects/${projectId}/artifacts`)))
}
