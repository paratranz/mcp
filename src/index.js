#!/usr/bin/env node
import process from 'node:process'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {ParatranzClient} from './client.js'
import {registerTools} from './tools/index.js'

const VERSION = '0.1.0'
const DEFAULT_BASE_URL = 'https://paratranz.cn/api'

const token = process.env.PARATRANZ_TOKEN
if (!token) {
  console.error('PARATRANZ_TOKEN is required. Create one in your ParaTranz profile settings.')
  process.exit(1)
}

const client = new ParatranzClient({
  baseUrl: process.env.PARATRANZ_API_BASE || DEFAULT_BASE_URL,
  token,
  timeoutMs: Number(process.env.PARATRANZ_TIMEOUT_MS) || 60000
})

const server = new McpServer({
  name: 'paratranz',
  version: VERSION
})

registerTools(server, client)

await server.connect(new StdioServerTransport())
console.error('paratranz-mcp connected via stdio')
