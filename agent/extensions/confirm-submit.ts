import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type InputEvent = {
    source: string;
    text: string;
    streamingBehavior?: string;
};

export function shouldConfirmSubmit(event: InputEvent): boolean {
    return event.source === "interactive"
        && event.streamingBehavior === undefined
        && event.text.trim().length > 0
        && !event.text.startsWith("/")
        && !event.text.startsWith("!");
}

export default function confirmSubmit(pi: ExtensionAPI) {
    pi.on("input", async (event, ctx) => {
        if (!ctx.hasUI || !shouldConfirmSubmit(event)) return { action: "continue" };

        if (await ctx.ui.confirm("确认开始执行吗？", event.text)) {
            return { action: "continue" };
        }

        ctx.ui.setEditorText(event.text);
        ctx.ui.setStatus("confirm-submit-render", undefined);
        return { action: "handled" };
    });
}