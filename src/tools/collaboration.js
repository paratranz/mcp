import {z} from 'zod'
import {callTool} from './helpers.js'

const projectId = z.number().int().positive().describe('Project ID')

export function registerCollaborationTools(server, client) {
  server.registerTool('list_members', {
    title: 'List members',
    description: 'List project members. Pass begin/end to compute contributions within a time range.',
    inputSchema: {
      projectId,
      begin: z.string().optional().describe('Contribution window start, ISO datetime'),
      end: z.string().optional().describe('Contribution window end, ISO datetime')
    }
  }, ({projectId, ...query}) => callTool(() => client.get(`/projects/${projectId}/members`, query)))

  server.registerTool('list_announcements', {
    title: 'List announcements',
    description: 'List project announcements. When bumped=true only pinned announcements are ' +
      'returned as a plain array; otherwise a paginated result is returned.',
    inputSchema: {
      projectId,
      page: z.number().int().min(1).optional().describe('Page number'),
      pageSize: z.number().int().min(1).max(1000).optional().describe('Page size, max 1000'),
      bumped: z.boolean().optional().describe('Only pinned announcements (returns an array)'),
      category: z.string().optional().describe('Filter by category')
    }
  }, ({projectId, ...query}) => callTool(() =>
    client.get(`/projects/${projectId}/announcements`, query)))

  server.registerTool('get_announcement', {
    title: 'Get announcement',
    description: 'Get a single announcement. Requires project manager permission.',
    inputSchema: {
      projectId,
      announcementId: z.number().int().positive().describe('Announcement ID')
    }
  }, ({projectId, announcementId}) => callTool(() =>
    client.get(`/projects/${projectId}/announcements/${announcementId}`)))

  server.registerTool('list_issues', {
    title: 'List issues',
    description: 'List project discussions with open/closed counts.',
    inputSchema: {
      projectId,
      page: z.number().int().min(1).optional().describe('Page number'),
      pageSize: z.number().int().min(1).max(1000).optional().describe('Page size, max 1000'),
      status: z.enum(['0', '1']).optional().describe('0 open, 1 closed'),
      uid: z.number().int().positive().optional().describe('Only issues created by this user')
    }
  }, ({projectId, ...query}) => callTool(() => client.get(`/projects/${projectId}/issues`, query)))

  server.registerTool('get_issue', {
    title: 'Get issue',
    description: 'Get an issue with replies and subscribers.',
    inputSchema: {
      projectId,
      issueId: z.number().int().positive().describe('Issue ID')
    }
  }, ({projectId, issueId}) => callTool(() =>
    client.get(`/projects/${projectId}/issues/${issueId}`)))

  server.registerTool('create_issue', {
    title: 'Create issue',
    description: 'Create a project discussion. Requires login; when issueMode is members-only, ' +
      'requires project membership.',
    inputSchema: {
      projectId,
      title: z.string().describe('Issue title'),
      content: z.string().optional().describe('Issue content, markdown')
    }
  }, ({projectId, ...body}) => callTool(() => client.post(`/projects/${projectId}/issues`, body)))

  server.registerTool('reply_issue', {
    title: 'Reply to issue',
    description: 'Reply to a project discussion. Requires login; when issueMode is private, ' +
      'requires project membership.',
    inputSchema: {
      projectId,
      issueId: z.number().int().positive().describe('Issue ID'),
      content: z.string().describe('Reply content, markdown')
    }
  }, ({projectId, issueId, content}) => callTool(() =>
    client.post(`/projects/${projectId}/issues/${issueId}`, {op: 'reply', content})))
}
