/**
 * Custom Header Extension — 复刻 001.png 头部样式（左右分栏，固定在顶部）
 *
 * 布局（参考 /Users/henry/.pi/001.png 顶部 pi-open-tui 风格）：
 *
 *     v1.4.0 ──────────────────────────────────────   ← 顶部：版本号 + 横线（动态匹配系统版本）
 *     <左侧标题>                          │ 安装插件        │ 系统命令        ← 右侧：两栏命令分组
 *     <副标题>                            │  pi install ... │  /help  ...
 *                                         │  ...            │  /settings ...
 *                                         │ 插件命令          ← 插件/扩展注册的 slash 命令
 *                                         │  /header  ...
 *     ─────────────────────────────────────────────────────   ← 底部：分隔线
 *
 * 左侧标题/副标题、右侧命令分组都在下方常量区修改即可。
 *
 * 用法：
 *   - 保存后执行 /reload 生效
 *   - 执行 /header 可切换 自定义/内置 header
 *
 * 固定头部说明：
 *   - 头部通过 TUI overlay 渲染在可视区顶部，滚动时不会随内容滚走。
 *   - 代价：头部占用的几行会覆盖在会话内容之上（选项 A）。
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import {
  parseColor,
  rgbColor,
  truncateToWidth,
  type Color,
  visibleWidth,
} from "@earendil-works/pi-tui";

// ============================================================
//  左侧：自定义标题（改这里）
// ============================================================
const TITLE = "Henry's Pi";
const SUBTITLE = "pi 个人配置 · princess-nam-rom";

// ============================================================
//  右侧：命令分组（改这里）
// ============================================================
interface CommandItem {
  cmd: string;
  desc: string;
}
interface CommandGroup {
  title: string;
  items: CommandItem[];
}

const COMMAND_GROUPS: CommandGroup[] = [
  {
    title: "安装插件",
    items: [
      { cmd: "pi install <src>", desc: "安装 npm/git 插件" },
      { cmd: "pi remove <src>", desc: "移除插件" },
      { cmd: "pi update --extensions", desc: "更新全部扩展" },
      { cmd: "pi list", desc: "查看已装插件" },
    ],
  },
  {
    title: "系统命令",
    items: [
      { cmd: "/help", desc: "帮助" },
      { cmd: "/settings", desc: "设置" },
      { cmd: "/reload", desc: "重载配置" },
      { cmd: "/theme", desc: "切换主题" },
      { cmd: "/model", desc: "切换模型" },
    ],
  },
];

// ============================================================
//  渲染
// ============================================================

/** 用空格补齐到指定显示宽度（正确处理 ANSI/宽字符）。 */
function padRight(line: string, width: number): string {
  const gap = width - visibleWidth(line);
  return gap > 0 ? line + " ".repeat(gap) : line;
}

/** 给一行文字铺满背景色并补齐到 width（等价 pi-tui 内部 applyBackgroundToLine，因其未从 index 导出故自实现）。 */
function paintLine(line: string, width: number, bg: (text: string) => string): string {
  const gap = width - visibleWidth(line);
  return bg(gap > 0 ? line + " ".repeat(gap) : line);
}

export default function (pi: ExtensionAPI) {
  let enabled = true;

  function install(ctx: ExtensionContext) {
    if (!enabled || ctx.mode !== "tui") return;

    // 插件/扩展注册的 slash 命令（session_start 时所有扩展已加载完毕）。
    // skill 命令的 name 形如 "skill:pdf"，这里统一补 "/" 前缀。
    const pluginCommands: CommandItem[] = pi
      .getCommands()
      .filter((c) => c.source === "extension" || c.source === "skill")
      .map((c) => ({ cmd: `/${c.name}`, desc: c.description ?? "" }))
      .sort((a, b) => a.cmd.localeCompare(b.cmd));

    ctx.ui.setHeader((tui, theme) => {
      /** 渲染单个命令分组（标题 + 对齐的 命令/描述 行）。 */
      const renderGroup = (group: CommandGroup, w: number): string[] => {
        const lines: string[] = [theme.bold(theme.fg("muted", group.title))];
        const maxCmdW = Math.max(...group.items.map((i) => visibleWidth(i.cmd)));
        for (const item of group.items) {
          const cmdCol = padRight(item.cmd, maxCmdW);
          lines.push(
            truncateToWidth(`${theme.fg("accent", cmdCol)}  ${theme.fg("dim", item.desc)}`, w),
          );
        }
        return lines;
      };

      // 背景色：优先终端默认背景(OSC 11)，拿不到则按明暗回退
      let terminalBg: Color | undefined;
      const fallbackBg: Color =
        theme.appearance === "dark" ? parseColor("#000000") : parseColor("#ffffff");
      const currentBg = (): Color => terminalBg ?? fallbackBg;
      const bgOf = (text: string): string => theme.style(text, { bg: currentBg() });

      // 异步探测终端默认背景（非阻塞；pi 启动时已发过 OSC 查询，通常很快返回）
      tui
        .queryTerminalColors({
          timeoutMs: 1000,
          onLateReply: (c) => {
            if (c.background) {
              terminalBg = rgbColor(c.background.r, c.background.g, c.background.b);
              tui.requestRender();
            }
          },
        })
        .then((c) => {
          if (c.background) {
            terminalBg = rgbColor(c.background.r, c.background.g, c.background.b);
            tui.requestRender();
          }
        })
        .catch(() => {});

      // 渲染 header 各行（不含背景铺底；背景在 overlay 层统一补齐到整行）
      const renderHeader = (width: number): string[] => {
        // 极窄终端退化为单行，避免分栏挤压
        if (width < 64) {
          const left = theme.fg("dim", `v${VERSION}`);
          const dash = theme.fg("accent", "─".repeat(Math.max(1, width - visibleWidth(left) - 1)));
          return [truncateToWidth(`${left} ${dash}`, width)];
        }

        // 左栏占 36%，右栏占剩余
        const leftW = Math.max(22, Math.floor(width * 0.36));
        const rightW = Math.max(20, width - leftW - 3);

        // 顶部：版本号 + 横线（去掉 π logo，版本号动态匹配系统）
        const topLeft = theme.fg("dim", `v${VERSION}`);
        const topDash = theme.fg("accent", "─".repeat(Math.max(1, width - visibleWidth(topLeft))));
        const topLine = truncateToWidth(`${topLeft} ${topDash}`, width);

        // 左栏行
        const leftLines: string[] = [theme.bold(TITLE)];
        if (SUBTITLE) leftLines.push(theme.fg("muted", SUBTITLE));

        // 右栏：前两个分组并排成两列，多余分组向下堆叠
        const colGap = 4;
        const colW = Math.max(12, Math.floor((rightW - colGap) / 2));
        const colA = renderGroup(COMMAND_GROUPS[0], colW);
        const colB = COMMAND_GROUPS[1] ? renderGroup(COMMAND_GROUPS[1], colW) : [];

        const rightLines: string[] = [];
        const twoColRows = Math.max(colA.length, colB.length);
        for (let i = 0; i < twoColRows; i++) {
          const a = i < colA.length ? colA[i] : "";
          const b = i < colB.length ? colB[i] : "";
          rightLines.push(truncateToWidth(`${padRight(a, colW)}${" ".repeat(colGap)}${b}`, rightW));
        }

        // 多余分组（如有）向下堆叠
        for (let gi = 2; gi < COMMAND_GROUPS.length; gi++) {
          rightLines.push("");
          rightLines.push(...renderGroup(COMMAND_GROUPS[gi], rightW));
        }

        // 插件命令区
        if (pluginCommands.length > 0) {
          rightLines.push("");
          rightLines.push(theme.bold(theme.fg("muted", "插件命令")));
          const maxCmdW = Math.max(...pluginCommands.map((i) => visibleWidth(i.cmd)));
          const shown = pluginCommands.slice(0, 8);
          for (const item of shown) {
            const cmdCol = padRight(item.cmd, maxCmdW);
            rightLines.push(
              truncateToWidth(`${theme.fg("accent", cmdCol)}  ${theme.fg("dim", item.desc)}`, rightW),
            );
          }
          if (pluginCommands.length > shown.length) {
            rightLines.push(theme.fg("dim", `… 还有 ${pluginCommands.length - shown.length} 个`));
          }
        }

        // 拼接左右两栏
        const sep = theme.fg("border", "│");
        const rows = Math.max(leftLines.length, rightLines.length);
        const body: string[] = [];
        for (let i = 0; i < rows; i++) {
          const l = i < leftLines.length ? leftLines[i] : "";
          const r = i < rightLines.length ? rightLines[i] : "";
          body.push(truncateToWidth(`${padRight(l, leftW)} ${sep} ${r}`, width));
        }

        // 底部：subtle 分隔线
        const bottom = theme.fg("borderMuted", "─".repeat(width));

        return [topLine, ...body, bottom];
      };

      // 顶部固定 overlay：铺满整行、不捕获输入，滚动时始终钉在可视区顶部
      const handle = tui.showOverlay(
        {
          render(width: number): string[] {
            return renderHeader(width).map((line) => paintLine(line, width, bgOf));
          },
          invalidate() {},
        },
        { anchor: "top-left", width: "100%", nonCapturing: true },
      );

      // 占位：返回空的可滚动 header 以抑制内置 header（真正渲染在 overlay 层）
      return {
        render(): string[] {
          return [];
        },
        invalidate() {},
        dispose() {
          handle.hide();
        },
      };
    });
  }

  pi.on("session_start", async (_event, ctx) => install(ctx));

  pi.registerCommand("header", {
    description: "Toggle custom header",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      if (enabled) {
        install(ctx);
        ctx.ui.notify("Custom header enabled", "info");
      } else {
        ctx.ui.setHeader(undefined);
        ctx.ui.notify("Built-in header restored", "info");
      }
    },
  });
}
