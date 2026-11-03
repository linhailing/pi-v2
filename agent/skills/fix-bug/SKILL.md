---
name: fix-bug
description: Fix bugs in existing code with a read-first, root-cause, minimal-change discipline. Use when the user asks to fix a bug, repair an error, resolve a defect, or change code that behaves unexpectedly. Do NOT use when the user only wants the error explained or diagnosed without a code change.
---

# Fix Bug

修 bug 的固定流程：先读旧逻辑 → 定位根因 → 划清影响面 → 改前确认 → 最小改动 → 双重验证。

## 何时走全流程 vs 快速处理

- **走全流程**：逻辑错误、行为异常、崩溃、并发/边界问题，或改动会触及既有行为。
- **快速处理**：拼写、文案、注释、明显的一处笔误——直接改，不必 `git blame`。

## 流程

### 1. 先读（禁改）

- 读目标代码现状、调用方、依赖；用 `git log` / `git blame` 理解「为什么这么写」。
- 未读完旧逻辑前，禁止动手。

### 2. 定位根因

- 先复现，确认触发条件；写清出错原因（why），而不是「看起来哪不对」。
- 根因要能解释「为什么以前没暴露 / 现在暴露」。

### 3. 划影响面

- 列出改动会影响的调用方、数据、行为。
- 区分「要修的行为」与「要保护的行为」：只改根因指向的那个行为。
- 旧逻辑不明（无注释/无测试/文档过时）时停下问 Henry，不臆测。

### 4. 改前报告（触发条件）

- 影响面大、跨模块、触及核心逻辑，或属不可逆改动时，先把「根因 + 影响面 + 方案」报 Henry 确认再动手。
- 影响小、范围明确的可直接改（遵循全局执行边界）。

### 5. 最小改动 + 安全网

- 改动保持最小变更集。
- 改前先 `commit` / `stash` / 开分支，留可回滚快照。

### 6. 双重验证（闸门）

- ① 修复有效：原复现路径不再触发。
- ② 未破坏旧行为：`git diff` 检查改动范围 → 跑现有测试 → LSP 诊断。
- 无测试时：做最小回归路径人工验证，并说明验证依据。
- 验证不过：停下报告，不硬改。
