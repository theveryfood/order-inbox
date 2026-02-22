import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "skybridge/server";
import { z } from "zod";
import { env } from "./env.js";
import { insertOrder, fetchOrders } from "./supabase.js";
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const SERVER_URL = "http://localhost:3000";
const server = new McpServer({ name: "order-inbox", version: "0.0.1" }, { capabilities: {} }).registerWidget("manage-tasks", {
    description: "View incoming customer orders",
    _meta: {
        ui: {
            csp: {
                resourceDomains: ["https://fonts.googleapis.com"],
                connectDomains: [env.SUPABASE_URL],
            },
        },
    },
}, {
    description: "Order Inbox: paste a raw WhatsApp/email order message to parse it with Claude and save it. Call with no arguments to list all orders.",
    inputSchema: {
        rawMessage: z
            .string()
            .optional()
            .describe("Raw WhatsApp/email order message to parse and save"),
    },
    annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false,
    },
}, async ({ rawMessage }, extra) => {
    const userId = extra.authInfo?.extra?.userId;
    if (!userId) {
        return {
            content: [{ type: "text", text: "Please sign in to manage orders." }],
            isError: true,
            _meta: {
                "mcp/www_authenticate": [
                    `Bearer resource_metadata="${SERVER_URL}/.well-known/oauth-protected-resource/mcp"`,
                ],
            },
        };
    }
    if (rawMessage && rawMessage.trim().length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const parseResponse = await anthropic.messages.create({
            model: "claude-opus-4-6",
            max_tokens: 1024,
            system: "You are an order parser for a food distribution business. Output ONLY valid JSON wrapped between <json> and </json>. No markdown, no explanation.",
            messages: [
                {
                    role: "user",
                    content: `Today is ${today}.

Wrap the JSON between <json> and </json>. Output nothing else.

JSON schema:
{
  "customerName": "string",
  "items": [{"product":"string","quantity": number}],
  "deliveryDate": "YYYY-MM-DD or null"
}

Message:
${rawMessage}`,
                },
            ],
        });
        const text = parseResponse.content[0]?.type === "text"
            ? parseResponse.content[0].text.trim()
            : "";
        let parsed = { customerName: "Unknown", items: [], deliveryDate: null };
        try {
            const match = text.match(/<json>\s*([\s\S]*?)\s*<\/json>/i);
            const jsonString = match ? match[1] : text;
            parsed = JSON.parse(jsonString);
        }
        catch {
            // keep defaults
        }
        const { error } = await insertOrder(userId, rawMessage, parsed.customerName, parsed.items, parsed.deliveryDate);
        if (error) {
            return {
                content: [{ type: "text", text: `Error saving order: ${error.message}` }],
                isError: true,
            };
        }
    }
    const { orders, error } = await fetchOrders(userId);
    if (error) {
        return {
            content: [{ type: "text", text: `Error fetching orders: ${error.message}` }],
            isError: true,
        };
    }
    const pending = orders.filter((o) => o.status === "pending").length;
    const confirmed = orders.filter((o) => o.status === "confirmed").length;
    const fulfilled = orders.filter((o) => o.status === "fulfilled").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    return {
        structuredContent: { orders },
        content: [
            {
                type: "text",
                text: `${orders.length} orders: ${pending} pending, ${confirmed} confirmed, ${fulfilled} fulfilled, ${cancelled} cancelled.`,
            },
        ],
    };
});
export default server;
//# sourceMappingURL=server.js.map