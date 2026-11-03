# Windows 迁移说明（`~/.pi` 配置跨平台使用）

> 本仓库的 Pi 配置在 macOS 与 Windows 间同步使用。核心原则：全局配置进仓库，
> 平台/本机相关内容（运行时、认证、bin 脚本、软链）不进仓库，或每台机器重建。

## 结论

本配置已按跨平台设计（`.gitignore` 正确排除了 `agent/install`、`agent/sessions`、
`agent/npm`、`agent/auth.json`、`agent/bin`），`git clone` 到 Windows 后基本直接可用，
只需处理下文的 4 个点。

## 一、让 bash 命令在 Windows 可用

pi 的 bash 工具在原生 Windows 下默认用 Git Bash，装
[Git for Windows](https://git-scm.com/download/win) 即可，无需改配置。

pi 解析 bash 的顺序（见官方 `windows.md`）：

1. `settings.json` 的 `shellPath`
2. `%ProgramFiles%\Git\bin\bash.exe`
3. `%ProgramFiles(x86)%\Git\bin\bash.exe`
4. `PATH` 上的 `bash.exe`

装完验证：

```text
!printf 'Bash is working\n'
```

若要改用 PowerShell（仍保留 bash 供 `!` 命令）：

```json
{ "defaultTools": ["read", "powershell", "edit", "write"] }
```

或直接跑在 WSL 里（用 Linux bash）。

## 二、迁移步骤

1. 装 Node.js + Git for Windows。
2. **重新安装 pi（Windows 版）**——不要拷贝 macOS 的 `agent/install/`（Mach-O 二进制），
   Windows 安装器会重建 `bin/pi` 为 `.cmd`/`.ps1`。
3. 克隆配置仓库到 `%USERPROFILE%\.pi`（即 `C:\Users\<你>\.pi`，`~` 同义）。
4. 首次启动 pi 会自动 `npm install` / `git clone` packages 依赖。

## 三、需要处理的 4 个点

### 1. 符号链接 `agent/skills/send-request`

git 里是 symlink（模式 `120000`），指向
`agent/npm/node_modules/pi-super-curl/skills/send-request`。
Windows 默认把 symlink 检出成普通文本文件，会导致该 skill 失效。

处理（二选一）：

- clone 前先 `git config core.symlinks true` 并开启 Windows 开发者模式，再 clone；
- 或 clone 后在 Windows 上手动重建软链（需开发者模式 / 管理员）：

```powershell
New-Item -ItemType SymbolicLink -Force `
  -Path "$env:USERPROFILE\.pi\agent\skills\send-request" `
  -Target "$env:USERPROFILE\.pi\agent\npm\node_modules\pi-super-curl\skills\send-request"
```

### 2. 认证 `agent/auth.json`

被 `.gitignore` 忽略，不同步。Windows 上重新登录 / 认证。

### 3. `agent/bin/` 目录（`fd`、`pi` 启动器）

被 `.gitignore` 忽略，不同步：

- `bin/pi`：由 Windows 安装器重建。
- `bin/fd`：macOS 的 Mach-O 二进制（本机工具，不被配置引用）。Windows 如需要，
  装 Windows 版：`winget install sharkdp.fd`（或 scoop），不用则忽略。

### 4. skill 里的 macOS 命令

`open`、`sed -i ''`、`unzip` 等只出现在 skill 指导 agent 的文案里，不是配置依赖。
agent 在 Windows 上执行时会自动改用对应工具（bash → Git Bash / powershell），无需改配置。

## 四、验证清单

- [ ] `!printf 'Bash is working\n'` 有输出 → bash 正常
- [ ] `/header`、`/reload` 等斜杠命令正常 → 扩展加载正常
- [ ] MCP（parallel-search / context7 / dbx / playwright）可用 → 全 `npx` 启动，跨平台
- [ ] `send-request` skill 生效 → 软链那条最容易漏

## 附：billion-context 软链方向（易混淆）

仓库里的 `agent/billion-context.json` 是**源文件（普通文件）**；
`~/.config/billion-context/billion-context.json` 才是**软链，指向仓库文件**。
Windows 上重建（PowerShell）：

```powershell
New-Item -ItemType SymbolicLink -Force `
  -Path "$env:USERPROFILE\.config\billion-context\billion-context.json" `
  -Target "$env:USERPROFILE\.pi\agent\billion-context.json"
```

无法建软链时改用环境变量：`setx BILI_CONFIG_FILE "%USERPROFILE%\.pi\agent\billion-context.json"`。
