import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDevices from "./tools/list_devices";
import getDevicePositions from "./tools/get_device_positions";
import updateDeviceStatus from "./tools/update_device_status";

// Read the Supabase project ref inline at build time via Vite env replacement.
// process.env.SUPABASE_URL is rewritten to the .lovable.cloud proxy on publish,
// which mcp-js rejects (RFC 8414 issuer mismatch), so we need the direct
// supabase.co host built from the project ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "phonetrack-mcp",
  title: "PhoneTrack MCP",
  version: "0.1.0",
  instructions:
    "Tools to manage a user's tracked phones on PhoneTrack. Use list_devices to discover devices, get_device_positions to read recent GPS history, and update_device_status to mark a device safe / lost / stolen.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDevices, getDevicePositions, updateDeviceStatus],
});
