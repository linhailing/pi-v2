import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const FINAL_CHANGE_SUMMARY_RULE = `如果本次任务实际修改、创建、删除或重命名了文件，最终回答必须包含“本次修改文件如下：”小节，并遵循以下规则：
1. 列出当前项目名称和项目目录。
2. 列出本次任务实际变更的文件，并标注“新增”“修改”“删除”或“重命名”。
3. 文件路径优先使用相对于当前项目目录的路径，不要列出与本次任务无关的既有变更。
4. 该小节必须放在“执行 /reload 后生效”、重启、部署或其他生效说明之前。
5. 如果本次任务没有修改任何文件，则不要输出该小节。

格式示例：
本次修改文件如下：

项目：.pi
目录：/Users/henry/.pi
修改文件（1）：
- [修改] agent/extensions/run-event.ts`;

export default function runEvent(pi: ExtensionAPI) {
    pi.on("before_agent_start", (event) => {
        if (event.messageType !== "user") return;

        const guidelines = event.systemPromptOptions.promptGuidelines;
        if (!guidelines.includes(FINAL_CHANGE_SUMMARY_RULE)) {
            guidelines.push(FINAL_CHANGE_SUMMARY_RULE);
        }
    });



    // ================================================
    // 当每一次任务执行完成都需要输出
    // ================================================
    pi.on("agent_settled", (_event, ctx) => {
        ctx.ui.notify("=============== 该任务已完成^_^ =================")
    });


}
