# Pi 个人配置仓库（`~/.pi`）

> Henry 的 Pi 编码代理个人配置，用 Git 管理，可跨机器同步。
>
> **核心原则**：全局（用户级）配置放本仓库；**项目级配置（密钥、baseUrl、测试地址、环境变量）放各自项目内，一律不进本仓库**。

---

## 目录结构

```
~/.pi/
├── README.md                 # 本文件
├── .gitignore                # 忽略本地状态、密钥、缓存
├── .pi/agent/                # 长记忆数据（long-term-memory.json）
└── agent/
    ├── settings.json         # 默认模型 / 包清单 / 主题（全局）
    ├── mcp.json              # MCP 服务声明（全局）
    ├── billion-context.json  # billion-context 配置（源文件；由 ~/.config/billion-context/billion-context.json 软链指向）
    ├── APPEND_SYSTEM.md      # 追加到系统提示的执行规则（全局）
    ├── auth.json             # Pi 认证凭证（本地，不入库）
    ├── models-store.json     # 模型定义（deepseek，含 baseUrl，不含 key）
    ├── chrome-connector.json # Chrome 连接器配置（全局）
    ├── polyglot-lsp.json     # 多语言 LSP 配置（全局）
    ├── extensions/           # 本地扩展
    ├── agents/               # 自定义子代理
    ├── skills/               # 技能（含 pi-super-curl 的软链）
    ├── git/…/agent-kit/      # vaayne/agent-kit（技能集合 + 配置同步）
    ├── npm/node_modules/     # npm 安装的包
    ├── install/              # Pi 运行时（本地，不入库）
    └── sessions/             # 会话记录（本地，不入库）
```

---

## 已安装插件清单

### 1. 包（`agent/settings.json` → `packages`）

| 包 | 作用 | 配置位置 |
| --- | --- | --- |
| `npm:pi-polyglot-lsp` | 多语言 LSP | `agent/polyglot-lsp.json`（全局） |
| `npm:@tintinweb/pi-subagents` | 子代理框架（Agent 工具 / @提及） | 无需额外配置 |
| `npm:pi-super-curl` | 提供 `send-request` 技能 | **项目级**：`.pi-super-curl/config.json` + `.env` |
| `npm:pi-chrome-connector` | `chrome_*` 浏览器工具 + 技能 | `agent/chrome-connector.json`（全局） |
| `npm:awesome-pi-themes` | 主题库 | `settings.json` → `theme`（当前 `princess-nam-rom`） |
| `npm:pi-footer` | 状态栏 | `agent/extensions/pi-footer.json` |
| `npm:@vtstech/pi-long-term-memory` | 长记忆 | `.pi/agent/long-term-memory.json` |
| `git:github.com/vaayne/agent-kit` | 技能集合 + 配置同步 | `agent/git/…/agent-kit/` |
| `npm:billion-context` | 会话内上下文压缩（native/proxy，子代理已关） | `agent/billion-context.json`（源文件；`~/.config/billion-context/billion-context.json` 软链指向它） |

### 2. 本地扩展（`agent/extensions/`）

| 文件 | 作用 |
| --- | --- |
| `confirm-submit.ts` | 交互式提交前二次确认 |
| `run-event.ts` | 任务完成时通知 |
| `stop.ts` | 提供 `/stop` 立即停止并恢复任务 |
| `pi-footer.json` | 状态栏样式（来自 pi-footer 包） |

### 3. 技能（Skills）

**内置/本地（`agent/skills/`）**：
canvas-design · doc-coauthoring · docx · frontend-design · find-skills · pdf · pptx · skill-creator · uniapp · webapp-testing · xlsx · send-request（软链到 pi-super-curl）

**agent-kit（`agent/git/…/agent-kit/skills/`）**：
ambition · cmail · humanizer · lark-cli · project-setup · python-script · refine-code · scout · tap

**chrome-connector（`agent/npm/…/pi-chrome-connector/skills/`）**：浏览器自动化。

### 4. 自定义子代理（`agent/agents/`）

| 文件 | 用途 | 依赖 |
| --- | --- | --- |
| `api-tester.md` | 轻量接口测试 | send-request（项目级配置） |
| `go-backend.md` | Go 后端接口开发 | gopls |
| `vue-frontend.md` | Vue 2/3、uniapp 前端开发 | pi-chrome-connector |

### 5. MCP 服务（`agent/mcp.json`）

| 名称 | 地址/命令 | 说明 |
| --- | --- | --- |
| `parallel-search` | `https://search.parallel.ai/mcp` | 联网搜索，直接工具，无需密钥 |
| `context7` | `npx -y @upstash/context7-mcp` | 拉取最新库文档，无需密钥 |

---

## 项目级配置（重点）

> 以下插件需要**在每个具体项目里单独配置**，不要写进本仓库。

### send-request / api-tester（pi-super-curl）

在**项目根目录**创建 `.pi-super-curl/config.json`（脚本会从当前目录向上查找），并用 `envFile` 指向 `.env`：

```json
{
  "baseUrl": "$API_BASE_URL",
  "envFile": ".env",
  "auth": {
    "type": "jwt",
    "secret": "$JWT_SECRET",
    "algorithm": "HS256",
    "expiresIn": 3600,
    "payload": { "user_id": "{{env.USER_ID}}" }
  },
  "headers": { "Content-Type": "application/json" },
  "endpoints": [
    { "name": "health", "url": "/health", "method": "GET" },
    { "name": "chat",   "url": "/api/chat", "method": "POST" }
  ]
}
```

`.env` 示例（项目内，勿提交真实密钥）：

```text
API_BASE_URL=https://your-api.example.com
JWT_SECRET=xxxxx
USER_ID=1
```

### cmail（域名邮箱）

通过环境变量提供（`.env` 或 secret manager，勿写进命令/聊天）：

```text
CMAIL_HOST=https://mail.example.com
CMAIL_EMAIL=admin@example.com
CMAIL_PASSWORD=xxxxx
# 可选
CMAIL_USER_AGENT=curl/8.0.0
CMAIL_ALLOW_INSECURE_HTTP=1   # 仅远程 HTTP 明确允许时
```

### lark-cli（飞书）

- 首次使用在每台机器执行 `lark-cli auth login`（凭证存本地，不入库）。
- 每次调用显式传 `--as user` 或 `--as bot`，身份不跨命令保留。
- `high-risk-write` 类命令需 `--yes` 且经用户确认。

### tap（公网搜索/抓取）

需要 Bun；渲染与站点脚本需 Lightpanda。搜索 provider 按需配置 API key（可选，未配置则用免 key 的 Exa 匿名端点）：

```text
FIRECRAWL_API_KEY / FIRECRAWL_API_URL
PARALLEL_API_KEY
TAVILY_API_KEY
EXA_API_KEY
JINA_API_KEY
SEARXNG_URL
BRAVE_SEARCH_API_KEY
KEENABLE_API_KEY
```

### webapp-testing / chrome-connector

- **webapp-testing**：被测服务地址与启动命令随项目而定，例如前端 `http://localhost:5173`（Vite）、后端 `http://localhost:3000`；需 Playwright。
- **chrome-connector**：工具全局可用（连接用户真实 Chrome），被测页面 URL 属于项目级；全局配置在 `agent/chrome-connector.json`。

### uniapp / go-backend / vue-frontend

- **uniapp**：`manifest.json`、`pages.json` 的各平台配置随项目而定。
- **go-backend / vue-frontend / api-tester**：针对具体项目代码工作，无需全局配置。

### polyglot-lsp（PHP）

`agent/polyglot-lsp.json` 已声明 PHP → intelephense，但需在机器上安装：`npm i -g intelephense`。

---

## 测试地址速查

| 用途 | 地址 |
| --- | --- |
| send-request 通用测试 | `https://httpbin.org/get` · `https://httpbin.org/anything` · `https://httpbin.org/post` |
| DeepSeek API | `https://api.deepseek.com` |
| Parallel Search MCP | `https://search.parallel.ai/mcp` |
| 前端 dev（webapp-testing / chrome） | `http://localhost:5173`（Vite 默认） |
| 后端 dev | `http://localhost:3000` |
| 各业务 API / 飞书 / 云邮箱 | 各自项目 `.env` 中的域名 |

---

## billion-context（上下文压缩）与三者关系

`npm:billion-context`（native/proxy 方案）负责**会话内上下文压缩**，与另外两个插件各司其职、零冲突：

| 插件 | 职责 | 关键配置 |
| --- | --- | --- |
| billion-context | 会话内压缩（`compress`/`decompress`/`search_context`/`acp_status`） | `agent/billion-context.json` → `"pi": { "subagents": false }` |
| pi-subagents | 子代理编排（`Agent`/`SubagentWorkflow`/FleetView/@提及） | 无需额外配置 |
| agent-kit | 技能（ambition/lark-cli/cmail/scout/tap…） | 直接用，**不跑 sync:config** |

### 关键配置：关闭内置子代理

billion-context 的 native 模式**默认自带子代理**（`acp_delegate`/`acp_delegate_wait`/`acp_delegate_cancel`），与 pi-subagents 冲突。已通过以下配置关闭（保留压缩）：

```jsonc
// 源文件 ~/.pi/agent/billion-context.json；软链在 ~/.config/billion-context/billion-context.json → 指向它
{ "pi": { "subagents": false } }
```

改配置后需**重启 pi 并开新会话**生效。验证：新会话工具列表只有 `Agent`/`SubagentWorkflow`（pi-subagents），无 `acp_delegate`；`/acp` 显示压缩状态。

### 跨系统同步（macOS / Windows）

配置文件放在本仓库 `agent/billion-context.json`，通过软链接接入 billion-context 的默认读取路径——两系统同为 `~/.config/billion-context/billion-context.json`（源码用 `homedir() + ".config"`，跨平台一致）。新机器克隆仓库后建一次软链即可：

```bash
# macOS / Linux
mkdir -p ~/.config/billion-context
ln -sf ~/.pi/agent/billion-context.json ~/.config/billion-context/billion-context.json
```

```powershell
# Windows（PowerShell，需开发者模式；或 cmd 的 mklink）
New-Item -ItemType SymbolicLink -Force `
  -Path "$env:USERPROFILE\.config\billion-context\billion-context.json" `
  -Target "$env:USERPROFILE\.pi\agent\billion-context.json"
```

> Windows 无法建符号链接时（无管理员权限 / 未开开发者模式），改用环境变量指向仓库文件：
> `setx BILI_CONFIG_FILE "%USERPROFILE%\.pi\agent\billion-context.json"`（macOS 亦可 `export BILI_CONFIG_FILE=~/.pi/agent/billion-context.json` 写入 shell rc）。

### 两种方案的区别（易混淆）

| | `billion-context`（已装） | `billion-context-pi`（未装） |
| --- | --- | --- |
| 形态 | proxy/native：自启动本地 proxy 转发模型流量 | 进程内扩展：拦截 `context` 事件 |
| 安装 | `pi install npm:billion-context`（或 `bili pi` 启动） | `pi install npm:billion-context-pi` |
| 子代理开关 | `agent/billion-context.json`（源文件） → `"pi": { "subagents": false }` | `~/.pi/acp.json` → `{ "delegate": false }` |
| 互斥 | 两者**互斥**，同时装会双重压缩 | 同上 |

> 若 `/acp` 报 `bili: no proxy detected`，说明 native 模式未接管成功，改用 `bili pi` 启动或 `bili plugin install pi`。

---

## 全局配置说明

- **`settings.json`**：默认 provider/model（deepseek / deepseek-v4-pro）、packages 清单、theme。
- **`mcp.json`**：parallel-search + context7，均无需密钥。
- **`APPEND_SYSTEM.md`**：追加的执行规则（中文、最小变更、数据库只读等）。
- **`models-store.json`**：deepseek 模型定义（baseUrl、成本、上下文窗口），不含 API key。
- **`auth.json` / `mcp-auth.json`**：凭证，本地文件，已 gitignore。

---

## 同步与注意事项

- 本仓库用 Git 管理：`git pull --ff-only` 拉取配置，改完 `git commit && git push`。
- 已忽略（`.gitignore`）：`.idea`、`.env*`、`agent/install`、`agent/sessions`、`agent/auth.json`、`agent/bin`。
- 换机器恢复：克隆本仓库到 `~/.pi`，执行 `pi install`（按 `settings.json` 的 packages 安装），再逐项补上项目级/机器级配置（send-request 的 config、cmail 环境变量、lark-cli 登录、intelephense 等）。
- ⚠️ **不要对 pi 运行 agent-kit 的 `mise run sync:config`**：它会用 agent-kit 的 4 个包（含 `pi-vcc` 压缩插件）**整体替换**本仓库 packages 里的 9 个包，billion-context 与 pi-subagents 会被移除，且 pi-vcc 与 billion-context 硬冲突。agent-kit 的技能（ambition/lark-cli/cmail/scout…）由 Pi 直接从 `agent/git/…/agent-kit/skills/` 加载，**不需要 sync**。
