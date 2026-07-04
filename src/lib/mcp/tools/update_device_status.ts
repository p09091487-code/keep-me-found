import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_device_status",
  title: "Update device status",
  description: "Mark one of the signed-in user's devices as safe, lost, or stolen.",
  inputSchema: {
    device_id: z.string().uuid().describe("Device UUID (from list_devices)."),
    status: z.enum(["safe", "lost", "stolen"]).describe("New status for the device."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ device_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("devices")
      .update({ status })
      .eq("id", device_id)
      .select("id, alias, status")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Device ${data.alias ?? data.id} is now ${data.status}.` }],
      structuredContent: { device: data },
    };
  },
});
