# @paratranz/mcp

[English](./README.en.md) | 简体中文

ParaTranz 的 MCP（Model Context Protocol）服务器，通过 stdio 运行，让支持 MCP 的 AI 客户端直接查询和编辑 ParaTranz 项目。

## 环境要求

- Node.js >= 20
- ParaTranz API Token：在个人资料页的「设置」选项卡获取

## 配置

| 环境变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `PARATRANZ_TOKEN` | 是 | - | ParaTranz API Token |
| `PARATRANZ_API_BASE` | 否 | `https://paratranz.cn/api` | API 地址（本地开发可指向 `http://localhost:3002/api`） |
| `PARATRANZ_TIMEOUT_MS` | 否 | `60000` | 单次请求超时（毫秒） |

## 客户端配置示例

Claude Desktop（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "paratranz": {
      "command": "npx",
      "args": ["-y", "@paratranz/mcp"],
      "env": {
        "PARATRANZ_TOKEN": "你的 Token"
      }
    }
  }
}
```

Cursor / 其他 MCP 客户端同理：以 stdio 方式启动 `paratranz-mcp`，并注入 `PARATRANZ_TOKEN`。

## 本地开发

```bash
# 安装依赖
yarn

# 直接运行（需要 Token）
PARATRANZ_TOKEN=xxx yarn start

# 单元测试
yarn test
```

## 当前工具

### 只读

项目与文件：

- `list_projects`：项目列表（game/uid/stage/source/target/filter 等筛选）
- `get_project`：项目详情
- `list_files` / `get_file`：文件列表与信息
- `get_file_strings`：某文件的全部词条（结果可能较大）
- `get_file_content`：归档的原文内容，可按版本或词条定位
- `list_file_revisions`：文件上传/导入/删除历史
- `list_file_labels`：文件标签
- `list_jobs` / `get_job`：导出任务列表与轮询
- `get_latest_artifact` / `get_artifact_link`：最近导出产物与签名下载链接

词条与翻译：

- `list_strings`：词条列表（文件/任务/状态/编辑人/翻译人/审核人/标签/字数/字段操作符筛选）
- `get_string`：词条详情（含历史与评论）
- `list_history`：项目历史（词条/术语/导入/评论，时间参数为 begin/end）
- `get_suggestions`：翻译记忆建议（服务端串行队列，避免并发）
- `get_string_terms`：词条命中的项目术语
- `get_mt_suggestion`：机器翻译建议（凭据按调用传入）

术语：

- `list_terms` / `get_term` / `list_term_history`

任务：

- `list_tasks` / `get_task`
- `get_task_artifact` / `get_task_artifact_link`

协作：

- `list_members` / `list_announcements` / `get_announcement`
- `list_issues` / `get_issue`

### 写入

- 词条：`update_string`、`batch_update_strings`（单次最多 1000 条；删除不暴露）
- 翻译导入：`import_file_translation`（items JSON 模式或本地文件 multipart）
- 术语：`create_term`、`update_term`、`import_terms`（JSON/CSV，可选 overwrite）
- 任务：`create_task`、`update_task`、`operate_task`、`update_task_strings`、`trigger_task_export`
- 项目导出：`trigger_project_export`
- 讨论：`create_issue`、`reply_issue`

写操作按项目角色校验：文件/翻译导入/任务/标签写需管理员，词条写入需翻译者以上，术语创建需成员。删除类操作与站内专用接口（加入口令、测试题库）不会暴露。

## 说明

- 工具权限与 Token 所属用户一致；写接口按项目角色校验（如文件写操作需管理员）
- 翻译建议接口开销较高，客户端需串行调用
- 发布 npm 使用 `npm publish --access public`（包已配置 `publishConfig.access`）

## License

[MIT](./LICENSE)
