import { McpServer } from "skybridge/server";
declare const server: McpServer<Record<never, import("skybridge/server").ToolDef<unknown, unknown, unknown>> & {
    "manage-tasks": import("skybridge/server").ToolDef<{
        rawMessage?: string | undefined;
    }, {
        orders: import("./supabase.js").Order[];
    }, {
        "mcp/www_authenticate": string[];
    }>;
}>;
export default server;
export type AppType = typeof server;
