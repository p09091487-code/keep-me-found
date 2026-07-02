import { createFileRoute } from "@tanstack/react-router";

/**
 * Worker : dépile pending_alerts (sent_at IS NULL) et envoie un e-mail via Resend.
 * Appelé par pg_cron toutes les minutes avec le header `apikey`.
 */
export const Route = createFileRoute("/api/public/process-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== anonKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return Response.json({ error: "RESEND_API_KEY missing" }, { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: alerts, error } = await supabaseAdmin
          .from("pending_alerts")
          .select("id, user_id, kind, payload, created_at")
          .is("sent_at", null)
          .order("created_at", { ascending: true })
          .limit(25);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!alerts || alerts.length === 0) return Response.json({ processed: 0 });

        let sent = 0;
        const errors: string[] = [];

        for (const a of alerts) {
          try {
            const { data: userRes, error: uErr } = await supabaseAdmin.auth.admin.getUserById(a.user_id);
            if (uErr || !userRes.user?.email) throw new Error(uErr?.message ?? "no email");
            const email = userRes.user.email;
            const p = (a.payload ?? {}) as Record<string, unknown>;
            const label = String(p.device_label ?? "Appareil");
            const status = String(p.status ?? "");
            const dist = Number(p.distance_m ?? 0);
            const lat = Number(p.latitude ?? 0);
            const lng = Number(p.longitude ?? 0);
            const when = String(p.recorded_at ?? new Date().toISOString());

            const subject = `🚨 Alerte zone de confiance — ${label}`;
            const html = `
              <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
                <h2 style="color:#dc2626;margin:0 0 8px">Sortie de zone détectée</h2>
                <p>Votre appareil <strong>${escapeHtml(label)}</strong> (statut : ${escapeHtml(status)}) est sorti de sa zone de confiance.</p>
                <ul>
                  <li>Distance depuis le point de confiance : <strong>${dist} m</strong></li>
                  <li>Position : ${lat.toFixed(5)}, ${lng.toFixed(5)}</li>
                  <li>Horodatage : ${escapeHtml(when)}</li>
                </ul>
                <p><a href="https://www.google.com/maps?q=${lat},${lng}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:white;border-radius:8px;text-decoration:none">Voir sur la carte</a></p>
                <p style="color:#64748b;font-size:12px;margin-top:24px">Alerte automatique PhoneTrack — vous recevez cet e-mail car les alertes sont activées pour cet appareil.</p>
              </div>`;

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "PhoneTrack <onboarding@resend.dev>",
                to: [email],
                subject,
                html,
              }),
            });
            if (!res.ok) {
              const body = await res.text();
              throw new Error(`Resend ${res.status}: ${body}`);
            }

            await supabaseAdmin
              .from("pending_alerts")
              .update({ sent_at: new Date().toISOString() })
              .eq("id", a.id);
            sent++;
          } catch (e) {
            errors.push(`${a.id}: ${(e as Error).message}`);
          }
        }

        return Response.json({ processed: alerts.length, sent, errors });
      },
    },
  },
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
