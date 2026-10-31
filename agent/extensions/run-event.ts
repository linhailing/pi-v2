import { ExtensionAPI } from "@earendil-works/pi-coding-agent"


export default function (pi: ExtensionAPI) {
    // ============================================================
    // 当每一次任务执行完成都需输出
    // ============================================================
    pi.on("agent_settled",async (_event, ctx) => {
        ctx.ui.notify("=============== 该任务已完成^_^ =================")
    })
}