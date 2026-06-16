import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// POST /api/public/auth/rate-check
// Body: { identifier: <email>, kind: "signin" | "reset", outcome?: "attempt" | "success" }
// "attempt"  → incremente le compteur, bloque au-delà du seuil
// "success"  → reset le compteur
const MAX_ATTEMPTS = 5;
const WINDOW_MIN = 15;
const BLOCK_MIN = 15;

const bodySchema = z.object({
  identifier: z.string().trim().toLowerCase().email().max(255),
  kind: z.enum(["signin", "reset"]),
  outcome: z.enum(["attempt", "success"]).default("attempt"),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export const Route = createFileRoute("/api/public/auth/rate-check")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders }); }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Validation failed" }, { status: 400, headers: corsHeaders });
        }
        const { identifier, kind, outcome } = parsed.data;

        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const now = new Date();

        if (outcome === "success") {
          await admin.from("auth_rate_limits").delete().eq("identifier", identifier).eq("kind", kind);
          return Response.json({ allowed: true }, { headers: corsHeaders });
        }

        const { data: existing } = await admin.from("auth_rate_limits")
          .select("attempts, window_start, blocked_until")
          .eq("identifier", identifier).eq("kind", kind).maybeSingle();

        if (existing?.blocked_until && new Date(existing.blocked_until) > now) {
          const retryAfter = Math.ceil((new Date(existing.blocked_until).getTime() - now.getTime()) / 1000);
          return Response.json(
            { allowed: false, retryAfter, message: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} min.` },
            { status: 429, headers: { ...corsHeaders, "Retry-After": String(retryAfter) } },
          );
        }

        const windowStart = existing?.window_start ? new Date(existing.window_start) : now;
        const withinWindow = (now.getTime() - windowStart.getTime()) < WINDOW_MIN * 60_000;
        const attempts = (withinWindow ? (existing?.attempts ?? 0) : 0) + 1;

        const shouldBlock = attempts >= MAX_ATTEMPTS;
        const update = {
          identifier,
          kind,
          attempts,
          window_start: withinWindow ? (existing?.window_start ?? now.toISOString()) : now.toISOString(),
          blocked_until: shouldBlock ? new Date(now.getTime() + BLOCK_MIN * 60_000).toISOString() : null,
          updated_at: now.toISOString(),
        };
        await admin.from("auth_rate_limits").upsert(update, { onConflict: "identifier,kind" });

        if (shouldBlock) {
          return Response.json(
            { allowed: false, retryAfter: BLOCK_MIN * 60, message: `Trop de tentatives. Réessayez dans ${BLOCK_MIN} min.` },
            { status: 429, headers: { ...corsHeaders, "Retry-After": String(BLOCK_MIN * 60) } },
          );
        }
        return Response.json({ allowed: true, attemptsRemaining: MAX_ATTEMPTS - attempts }, { headers: corsHeaders });
      },
    },
  },
});
