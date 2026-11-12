import {z} from 'zod'
import {callTool} from './helpers.js'

const projectId = z.number().int().positive().describe('Project ID')
const page = z.number().int().min(1).optional().describe('Page number')
const pageSize = z.number().int().min(1).max(1000).optional().describe('Page size, max 1000')

export function registerFileTools(server, client) {
  server.registerTool('get_file_content', {
    title: 'Get file content',
    description: 'Get the archived original content of a file, optionally a specific revision ' +
      'or the version a string was imported from (with a highlight locator).',
    inputSchema: {
      projectId,
      fileId: z.number().int().positive().describe('File ID'),
      rev: z.number().int().positive().optional().describe('File revision (archive) ID'),
      tid: z.number().int().positive().optional().describe('String ID, returns the original version it was imported from')
    }
  }, ({projectId, fileId, ...query}) => callTool(() =>
    client.get(`/projects/${projectId}/files/${fileId}/content`, query)))

  server.registerTool('list_file_revisions', {
    title: 'List file revisions',
    description: 'List file upload/import/delete history of a project. Requires project membership.',
    inputSchema: {
      projectId,
      file: z.number().int().positive().optional().describe('Only revisions of this file'),
      type: z.enum(['create', 'update', 'import', 'delete']).optional().describe('Revision type'),
      filename: z.string().optional().describe('Fuzzy filter by file name'),
      begin: z.string().optional().describe('Only revisions created after this ISO datetime'),
      end: z.string().optional().describe('Only revisions created before this ISO datetime'),
      page,
      pageSize
    }
  }, ({projectId, ...query}) => callTool(() =>
    client.get(`/projects/${projectId}/files/revisions`, query)))

  server.registerTool('list_file_labels', {
    title: 'List file labels',
    description: 'List file labels of a project. Label IDs can be used to filter list_strings.',
    inputSchema: {projectId}
  }, ({projectId}) => callTool(() => client.get(`/projects/${projectId}/files/labels`)))

  server.registerTool('list_jobs', {
    title: 'List export jobs',
    description: 'List build/export jobs of a project, newest first. Use get_job to poll a job status.',
    inputSchema: {
      projectId,
      status: z.number().int().optional().describe('0 pending/running, 1 succeeded, 2 failed'),
      limit: z.number().int().min(1).optional().describe('Maximum number of jobs, default 10'),
      type: z.string().optional().describe('Job type, e.g. buildProject or buildTask')
    }
  }, ({projectId, ...query}) => callTool(() => client.get(`/projects/${projectId}/jobs`, query)))

  server.registerTool('get_job', {
    title: 'Get export job',
    description: 'Get a build/export job by ID to poll its status and result.',
    inputSchema: {
      projectId,
      jobId: z.number().int().positive().describe('Job ID')
    }
  }, ({projectId, jobId}) => callTool(() => client.get(`/projects/${projectId}/jobs/${jobId}`)))

  server.registerTool('get_latest_artifact', {
    title: 'Get latest artifact',
    description: 'Get the latest export artifact of a project, or null when nothing was exported yet.',
    inputSchema: {projectId}
  }, ({projectId}) => callTool(() => client.get(`/projects/${projectId}/artifacts/latest`)))

  server.registerTool('get_artifact_link', {
    title: 'Get artifact download link',
    description: 'Resolve the signed download URL of the latest project export archive. ' +
      'Returns a URL, not the binary file.',
    inputSchema: {projectId}
  }, ({projectId}) => callTool(async () => {
    const result = await client.getRedirect(`/projects/${projectId}/artifacts/download`)
    return result.location || result
  }))
}
