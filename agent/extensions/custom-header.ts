/**
 * Custom Header Extension — 复刻 pi-open-tui 风格头部（左右分栏，固定在顶部）
 *
 * 布局：
 *
 *     v1.4.0 ──────────────────────────────────────   ← 顶部：版本号 + 横线
 *     📁 当前目录                        │ 安装插件        │ 系统命令        ← 右侧：两栏命令分组
 *     <标题>                             │  pi install ... │  /help  ...
 *     <副标题>                           │  ...            │  /settings ...
 *                                         │  ...            │  /settings ...
 *                                         │  [ 插件命令 · N ] ← 可点击按钮（N 为数量，点击弹层看全部）
 *     ─────────────────────────────────────────────────────   ← 底部：分隔线
 *
 * 左侧显示当前目录（ctx.cwd）及标题/副标题，右侧命令分组都在下方常量区修改。
 * 右侧「[ 插件命令 · N ]」为可点击按钮（N 为插件命令数量）：点击后弹出弹层，列出插件/技能注册的
 * 全部 slash 命令及其使用说明（界面文案中文），支持 ↑↓ 滚动、Esc 关闭。
 *
 * 用法：
 *   - 保存后执行 /reload 生效
 *   - 执行 /header 可切换 自定义/内置 header
 *
 * 说明：
 *   - 头部通过 TUI overlay 渲染在可视区顶部，滚动时不会随内容滚走。
 *   - 鼠标点击仅在 fullscreen（alt-screen）模式下可路由到组件；
 *     普通模式终端拥有鼠标，此时按钮不可点。
 */

import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import {
  matchesKey,
  parseColor,
  rgbColor,
  truncateToWidth,
  visibleWidth,
  type Color,
  type Component,
  type TuiMouseEvent,
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
//  插件命令弹层配置
// ============================================================

/** 「插件命令」按钮标签在 install 内按插件数量动态生成，形如 `[ 插件命令 · N ]`。 */

/** 弹层宽度（列）。 */
const POPUP_WIDTH = 64;

/** 弹层最大高度（行，含边框）。 */
const POPUP_MAX_HEIGHT = 22;

// ============================================================
//  工具
// ============================================================

/** 用空格补齐到指定显示宽度（正确处理 ANSI/宽字符）。 */
function padRight(line: string, width: number): string {
  const gap = width - visibleWidth(line);
  return gap > 0 ? line + " ".repeat(gap) : line;
}

/** 给一行文字铺满背景色并补齐到 width。 */
function paintLine(line: string, width: number, bg: (text: string) => string): string {
  const gap = width - visibleWidth(line);
  return bg(gap > 0 ? line + " ".repeat(gap) : line);
}

// ============================================================
//  插件命令弹层组件
// ============================================================

/** 弹层：列出全部插件命令 + 使用说明，支持滚动与 Esc 关闭。 */
class CommandPopup implements Component {
  private scroll = 0;
  private theme: Theme;
  private commands: CommandItem[];
  private done: () => void;
  private maxHeight: number;
  private bg: (text: string) => string;

  constructor(
    theme: Theme,
    commands: CommandItem[],
    done: () => void,
    maxHeight: number,
    bg: (text: string) => string,
  ) {
    this.theme = theme;
    this.commands = commands;
    this.done = done;
    this.maxHeight = maxHeight;
    this.bg = bg;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "q")) {
      this.done();
      return;
    }
    if (matchesKey(data, "up") || matchesKey(data, "k")) {
      this.scroll = Math.max(0, this.scroll - 1);
      return;
    }
    if (matchesKey(data, "down") || matchesKey(data, "j")) {
      this.scroll = Math.min(this.maxScroll(), this.scroll + 1);
      return;
    }
  }

  invalidate(): void {}

  /** 命令列表的可视行数（顶边框 + 标题 + 说明 + 提示 + 底边框 = 5 行固定开销）。 */
  private visibleRows(): number {
    return Math.max(1, this.maxHeight - 5);
  }

  private maxScroll(): number {
    return Math.max(0, this.commands.length - this.visibleRows());
  }

  /** 生成一行带左右边框的内容。 */
  private row(content: string, innerW: number): string {
    const v = this.theme.fg("border", "│");
    return `${v}${padRight(content, innerW)}${v}`;
  }

  render(width: number): string[] {
    const innerW = Math.max(1, width - 2);
    const h = "─";
    const border = (text: string) => this.theme.fg("border", text);
    const lines: string[] = [];

    // 顶边框
    lines.push(border(`╭${h.repeat(innerW)}╮`));

    // 标题
    lines.push(this.row(` ${this.theme.bold(this.theme.fg("accent", "插件命令"))} `, innerW));

    // 说明行
    const count = this.commands.length;
    const hint = count > 0 ? `输入 / 前缀使用 · 共 ${count} 个命令` : "暂无可用的插件命令";
    lines.push(this.row(this.theme.fg("dim", hint), innerW));

    // 命令列表
    const vis = this.visibleRows();
    const start = this.scroll;
    const end = Math.min(count, start + vis);
    const rawMaxCmdW = count > 0 ? Math.max(...this.commands.map((c) => visibleWidth(c.cmd))) : 0;
    const maxCmdW = Math.min(rawMaxCmdW, 24);
    const descW = Math.max(1, innerW - maxCmdW - 2);

    if (count === 0) {
      lines.push(this.row(this.theme.fg("muted", "（无）"), innerW));
    } else {
      for (let i = start; i < end; i++) {
        const item = this.commands[i];
        const cmdCol = padRight(truncateToWidth(item.cmd, maxCmdW), maxCmdW);
        const descCol = truncateToWidth(item.desc || "暂无说明", descW);
        lines.push(
          this.row(
            `${this.theme.fg("accent", cmdCol)}  ${this.theme.fg("dim", descCol)}`,
            innerW,
          ),
        );
      }
    }
    // 列表区补齐空行，保持弹层高度稳定
    const listRendered = Math.min(vis, Math.max(1, count));
    for (let i = listRendered; i < vis; i++) {
      lines.push(this.row("", innerW));
    }

    // 提示行（左侧操作提示，右侧位置指示）
    const footerLeft = this.maxScroll() > 0 ? "↑↓ 滚动 · Esc 关闭" : "Esc 关闭";
    const pos = count > 0 ? `${this.scroll + 1}-${end} / ${count}` : "";
    const gap = innerW - visibleWidth(footerLeft) - visibleWidth(pos);
    const footer = `${footerLeft}${" ".repeat(Math.max(0, gap))}${pos}`;
    lines.push(this.row(this.theme.fg("muted", footer), innerW));

    // 底边框
    lines.push(border(`╰${h.repeat(innerW)}╯`));

    return lines.map((l) => paintLine(l, width, this.bg));
  }
}

// ============================================================
//  扩展入口
// ============================================================

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

      // 弹层是否已打开（防重入）
      let popupOpen = false;

      const openPopup = async (): Promise<void> => {
        if (popupOpen) return;
        popupOpen = true;
        try {
          await ctx.ui.custom<void>(
            (_tui, popupTheme, _kb, done) =>
              new CommandPopup(popupTheme, pluginCommands, done, POPUP_MAX_HEIGHT, bgOf),
            {
              overlay: true,
              overlayOptions: { anchor: "center", width: POPUP_WIDTH, maxHeight: POPUP_MAX_HEIGHT },
            },
          );
        } finally {
          popupOpen = false;
        }
      };

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

      // 「插件命令」按钮标签（含数量）与位置（render 时更新，handleMouse 时读取）
      const pluginBtnLabel = `[ 插件命令 · ${pluginCommands.length} ]`;
      const btnW = visibleWidth(pluginBtnLabel);
      let btnRow = -1;
      let btnCol = -1;

      // 渲染 header 各行（不含背景铺底；背景在 overlay 层统一补齐到整行）
      const renderHeader = (width: number): string[] => {
        // 极窄终端退化为单行，避免分栏挤压（此时不显示按钮）
        if (width < 64) {
          btnRow = -1;
          btnCol = -1;
          const left = theme.fg("dim", `v${VERSION}`);
          const dash = theme.fg("accent", "─".repeat(Math.max(1, width - visibleWidth(left) - 1)));
          return [truncateToWidth(`${left} ${dash}`, width)];
        }

        // 左栏占 36%，右栏占剩余
        const leftW = Math.max(22, Math.floor(width * 0.36));
        const rightW = Math.max(20, width - leftW - 3);

        // 顶部：版本号 + 横线
        const topLeft = theme.fg("dim", `v${VERSION}`);
        const topDash = theme.fg("accent", "─".repeat(Math.max(1, width - visibleWidth(topLeft))));
        const topLine = truncateToWidth(`${topLeft} ${topDash}`, width);

        // 左栏行：当前目录（主）+ 品牌标题/副标题
        const leftLines: string[] = [
          truncateToWidth(theme.bold(theme.fg("accent", `📁 ${ctx.cwd}`)), leftW),
          theme.bold(TITLE),
        ];
        if (SUBTITLE) leftLines.push(theme.fg("muted", SUBTITLE));

        // 右栏：前两个分组并排成两列
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

        // 插件命令区：仅显示可点击按钮（含数量），点击弹层看全部
        rightLines.push("");
        rightLines.push(theme.bold(theme.fg("accent", pluginBtnLabel)));

        // 记录按钮位置（header 内行号 = 顶部版本行 + rightLines 中的下标）
        btnRow = 1 + rightLines.length - 1;
        btnCol = leftW + 3; // 左栏 + 空格 + 分隔符 + 空格

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
          handleMouse(event: TuiMouseEvent) {
            if (
              btnRow >= 0 &&
              event.type === "click" &&
              event.button === "left" &&
              event.y === btnRow &&
              event.x >= btnCol &&
              event.x < btnCol + btnW
            ) {
              void openPopup();
              return { handled: true };
            }
            return undefined;
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
    description: "切换自定义/内置 header",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      if (enabled) {
        install(ctx);
        ctx.ui.notify("已启用自定义 header", "info");
      } else {
        ctx.ui.setHeader(undefined);
        ctx.ui.notify("已恢复内置 header", "info");
      }
    },
  });
}
