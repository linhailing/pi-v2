import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const entryType = "stop-resume";

export default function (pi: ExtensionAPI) {
    pi.on("session_start", (event, ctx) => {
        if (event.reason !== "resume") return;

        const entry = ctx.sessionManager.getBranch().at(-1);
        if (entry?.type === "custom" && entry.customType === entryType) {
            // @ts-ignore
            ctx.ui.setEditorText(entry.data.prompt);
        }
    });

    pi.registerCommand("stop", {
        description: "立即停止当前任务",
        handler: async (_args, ctx) => {
            const entry = ctx.sessionManager.getBranch().findLast(
                (entry) => entry.type === "message" && entry.message.role === "user",
            );

            ctx.abort();
            await ctx.waitForIdle();
            if (entry?.type !== "message" || entry.message.role !== "user") return;

            const { content } = entry.message;
            let prompt: string;
            if (typeof content === "string") {
                prompt = content;
            } else {
                prompt = content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");
            }
            pi.appendEntry(entryType, { prompt });
            ctx.ui.setEditorText(prompt);
        },
    });
}