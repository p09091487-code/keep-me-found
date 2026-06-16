import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Endpoint compagnon : POST /api/public/positions
// Header: Authorization: Bearer <user JWT issued by Lovable Cloud / Supabase>
// Body : { device_id, latitude, longitude, accuracy?, recorded_at? }
const bodySchema = z.object({
  device_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  recorded_at: z.string().datetime().optional(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export const Route = createFileRoute("/api/public/positions")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) {
          return Response.json({ error: "Missing bearer token" }, { status: 401, headers: corsHeaders });
        }
        const token = auth.slice(7);

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

        // Validate token & resolve user.
        const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return Response.json({ error: "Invalid token" }, { status: 401, headers: corsHeaders });
        }

        let payload: unknown;
        try { payload = await request.json(); }
        catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders }); }

        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400, headers: corsHeaders });
        }
        const data = parsed.data;

        // Insert via the user-scoped client → RLS applies (positions policy checks device ownership).
        const { error } = await userClient.from("positions").insert({
          device_id: data.device_id,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          ...(data.recorded_at ? { recorded_at: data.recorded_at } : {}),
        });
        if (error) {
          const status = error.code === "42501" ? 403 : 400;
          return Response.json({ error: error.message }, { status, headers: corsHeaders });
        }
        return Response.json({ ok: true }, { status: 201, headers: corsHeaders });
      },
    },
  },
});
