import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_device_positions",
  title: "Get device positions",
  description: "Return the most recent GPS positions recorded for one of the signed-in user's devices.",
  inputSchema: {
    device_id: z.string().uuid().describe("Device UUID (from list_devices)."),
    limit: z.number().int().min(1).max(200).default(20).describe("Max positions to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ device_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("positions")
      .select("id, latitude, longitude, accuracy, recorded_at")
      .eq("device_id", device_id)
      .order("recorded_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { positions: data ?? [] },
    };
  },
});
