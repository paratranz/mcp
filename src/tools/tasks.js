import {z} from 'zod'
import {callTool} from './helpers.js'

const projectId = z.number().int().positive().describe('Project ID')
const taskId = z.number().int().positive().describe('Task ID')
const kind = z.enum(['source', 'translation']).describe('Export kind: source or translation')

export function registerTaskTools(server, client) {
  server.registerTool('list_tasks', {
    title: 'List tasks',
    description: 'List project tasks (pinned first). Requires the project task feature (extra.task) ' +
      'to be enabled and project membership. Set list=true for a lightweight array (max 100).',
    inputSchema: {
      projectId,
      page: z.number().int().min(1).optional().describe('Page number, default 1'),
      pageSize: z.number().int().min(1).max(1000).optional().describe('Page size, default 20, max 1000'),
      list: z.boolean().optional().describe('Return lightweight array instead of pagination'),
      name: z.string().optional().describe('Fuzzy filter by title; list mode only'),
      id: z.array(z.number().int().positive()).optional().describe('Task IDs; list mode only')
    }
  }, ({projectId, ...query}) => callTool(() => client.get(`/projects/${projectId}/tasks`, query)))

  server.registerTool('get_task', {
    title: 'Get task',
    description: 'Get a task with files and word-count statistics. Requires project membership ' +
      'and the project task feature.',
    inputSchema: {projectId, taskId}
  }, ({projectId, taskId}) => callTool(() =>
    client.get(`/projects/${projectId}/tasks/${taskId}`)))

  server.registerTool('get_task_artifact', {
    title: 'Get task artifact',
    description: 'Get the latest exported artifact of a task for the given kind, or null.',
    inputSchema: {projectId, taskId, kind}
  }, ({projectId, taskId, ...query}) => callTool(() =>
    client.get(`/projects/${projectId}/tasks/${taskId}/artifacts`, query)))

  server.registerTool('get_task_artifact_link', {
    title: 'Get task artifact download link',
    description: 'Resolve the signed download URL of the latest exported task archive. ' +
      'Returns a URL, not the binary file.',
    inputSchema: {projectId, taskId, kind}
  }, ({projectId, taskId, ...query}) => callTool(async () => {
    const result = await client.getRedirect(`/projects/${projectId}/tasks/${taskId}/artifacts/download`, query)
    return result.location || result
  }))

  server.registerTool('create_task', {
    title: 'Create task',
    description: 'Create a project task. Requires manager role or above and the project task ' +
      'feature (extra.task). Goal values are completion ratios between 0 and 1.',
    inputSchema: {
      projectId,
      title: z.string().max(128).describe('Task title'),
      goal: z.object({
        translate: z.number().min(0).max(1).optional().describe('Translation goal'),
        check: z.number().min(0).max(1).optional().describe('Check goal'),
        review: z.number().min(0).max(1).optional().describe('Review goal')
      }).describe('Task goals'),
      content: z.string().optional().describe('Task description, markdown'),
      deadline: z.union([z.string(), z.null()]).optional().describe('Deadline ISO datetime, null for none'),
      bumped: z.boolean().optional().describe('Pin the task'),
      members: z.array(z.number().int().positive()).max(100).optional()
        .describe('Assigned member user IDs, display only')
    }
  }, ({projectId, members, ...body}) => callTool(() => {
    const payload = members ? {...body, extra: {members}} : body
    return client.post(`/projects/${projectId}/tasks`, payload)
  }))

  server.registerTool('update_task', {
    title: 'Update task',
    description: 'Update task fields. Requires manager role or above; only provided fields change. ' +
      'Set deadline to null for no deadline; bumped=true pins, false unpins.',
    inputSchema: {
      projectId,
      taskId,
      title: z.string().max(128).optional().describe('Task title'),
      goal: z.object({
        translate: z.number().min(0).max(1).optional(),
        check: z.number().min(0).max(1).optional(),
        review: z.number().min(0).max(1).optional()
      }).optional().describe('Task goals'),
      content: z.string().optional().describe('Task description, markdown'),
      deadline: z.union([z.string(), z.null()]).optional().describe('Deadline ISO datetime, null to clear'),
      bumped: z.boolean().optional().describe('true pins, false unpins'),
      members: z.array(z.number().int().positive()).max(100).optional()
        .describe('Assigned member user IDs, display only')
    }
  }, ({projectId, taskId, members, ...raw}) => callTool(() => {
    const body = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined))
    if (members) {
      body.extra = {members}
    }
    if (!Object.keys(body).length) {
      throw new Error('Provide at least one field to update')
    }
    return client.put(`/projects/${projectId}/tasks/${taskId}`, body)
  }))

  server.registerTool('operate_task', {
    title: 'Operate task',
    description: 'Pin (pin), unpin (unpin) or mark a task finished (finish). Requires manager role or above.',
    inputSchema: {
      projectId,
      taskId,
      op: z.enum(['pin', 'unpin', 'finish']).describe('Operation')
    }
  }, ({projectId, taskId, op}) => callTool(() =>
    client.post(`/projects/${projectId}/tasks/${taskId}`, {op})))

  server.registerTool('update_task_strings', {
    title: 'Update task strings',
    description: 'Add strings to or remove strings from a task (explicit string tracking only). ' +
      'Requires manager role or above; up to 1000 IDs per call. Finished tasks cannot be changed.',
    inputSchema: {
      projectId,
      taskId,
      op: z.enum(['add', 'remove']).describe('Operation'),
      items: z.array(z.number().int().positive()).min(1).max(1000).describe('String IDs')
    }
  }, ({projectId, taskId, op, items}) => callTool(() =>
    client.put(`/projects/${projectId}/tasks/${taskId}/strings`, {op, items})))

  server.registerTool('trigger_task_export', {
    title: 'Trigger task export',
    description: 'Trigger a task-level export of source or translation files. Requires membership ' +
      'and project download permission. Returns a job; poll it with get_job.',
    inputSchema: {projectId, taskId, kind}
  }, ({projectId, taskId, kind}) => callTool(() =>
    client.post(`/projects/${projectId}/tasks/${taskId}/artifacts`, {kind})))
}
