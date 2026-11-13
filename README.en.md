# @paratranz/mcp

English | [简体中文](./README.md)

An MCP (Model Context Protocol) server for [ParaTranz](https://paratranz.cn). It runs over stdio and lets MCP-capable AI clients query and edit ParaTranz projects directly.

## Requirements

- Node.js >= 20
- A ParaTranz API token: Profile → Settings

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `PARATRANZ_TOKEN` | Yes | - | ParaTranz API token |
| `PARATRANZ_API_BASE` | No | `https://paratranz.cn/api` | API base URL (`http://localhost:3002/api` for local development) |
| `PARATRANZ_TIMEOUT_MS` | No | `60000` | Request timeout in milliseconds |

## Client configuration

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "paratranz": {
      "command": "npx",
      "args": ["-y", "@paratranz/mcp"],
      "env": {
        "PARATRANZ_TOKEN": "your-token"
      }
    }
  }
}
```

For Cursor and other MCP clients, start `paratranz-mcp` over stdio and inject `PARATRANZ_TOKEN`.

## Local development

```bash
yarn
PARATRANZ_TOKEN=xxx yarn start
yarn test
```

## Tools

### Read-only

Projects and files:

- `list_projects`: list projects (game/uid/stage/source/target/filter)
- `get_project`: project details
- `list_files` / `get_file`: file list and metadata
- `get_file_strings`: all strings of a file (may be large)
- `get_file_content`: archived original content, by revision or string
- `list_file_revisions`: file upload/import/delete history
- `list_file_labels`: file labels
- `list_jobs` / `get_job`: export jobs and polling
- `get_latest_artifact` / `get_artifact_link`: latest export artifact and signed download URL

Strings and translation:

- `list_strings`: strings with file/task/stage/editor/translator/reviewer/label/word-count/field-operator filters
- `get_string`: string details with history and comments
- `list_history`: project history (strings/terms/imports/comments, time range uses begin/end)
- `get_suggestions`: translation memory suggestions (serialized by this server)
- `get_string_terms`: project terms matched in a string
- `get_mt_suggestion`: machine translation suggestion (credentials passed per call)

Terms:

- `list_terms` / `get_term` / `list_term_history`

Tasks:

- `list_tasks` / `get_task`
- `get_task_artifact` / `get_task_artifact_link`

Collaboration:

- `list_members` / `list_announcements` / `get_announcement`
- `list_issues` / `get_issue`

### Write

- Files: `operate_file` (folder rename via renameFolder, file merge via mergeFiles)
- Strings: `update_string`, `batch_update_strings` (up to 1000 per call; deletion is not exposed)
- Translation import: `import_file_translation` (JSON items or multipart file)
- Terms: `create_term`, `update_term`, `import_terms` (JSON/CSV, optional overwrite)
- Tasks: `create_task`, `update_task`, `operate_task`, `update_task_strings`, `trigger_task_export`
- Project export: `trigger_project_export`
- Discussions: `create_issue`, `reply_issue`

Write operations check project roles: file writes, translation imports, tasks and file labels require manager; string writes require translator or above; term creation requires project membership. Destructive operations and site-internal endpoints (join password, application tests) are not exposed.

## Publishing

Publishing uses Trusted Publishing (OIDC) and is triggered by a tag (`.github/workflows/publish.yml`):

1. Configure a Trusted Publisher on npmjs.com for `@paratranz/mcp`: GitHub repository
   `paratranz/mcp`, workflow `publish.yml`, empty Environment
2. Bump the version in `package.json` and commit
3. Push a tag: `git tag v0.1.0 && git push origin v0.1.0`

The workflow verifies that the tag matches the package version, runs the tests, then
publishes with `--provenance` via OIDC. No long-lived token is required. You can also
trigger it manually from Actions → Publish → Run workflow.

> First release: if npm does not allow pre-configuring a Trusted Publisher for an
> unpublished package, run `npm login` and publish once manually with
> `npm publish --access public --registry=https://registry.npmjs.org`, then add the
> Trusted Publisher configuration.

## Notes

- Tool permissions follow the token user; write endpoints check project roles (for example, file writes require manager)
- The suggestions endpoint is expensive; requests are serialized by this server

## License

[MIT](./LICENSE)
