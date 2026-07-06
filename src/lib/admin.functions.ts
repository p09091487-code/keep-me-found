import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: { rpc: (fn: "is_app_admin") => Promise<{ data: unknown; error: { message: string } | null }> } }) {
  const { data, error } = await ctx.supabase.rpc("is_app_admin");
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const d1 = new Date(now); d1.setDate(d1.getDate() - 1);
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    const [profiles, devices, openMsgs, vToday, v7, v30] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("devices").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("support_messages").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabaseAdmin.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", d7.toISOString()),
      supabaseAdmin.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", d30.toISOString()),
    ]);

    return {
      users: profiles.count ?? 0,
      devices: devices.count ?? 0,
      openSupport: openMsgs.count ?? 0,
      viewsToday: vToday.count ?? 0,
      views7: v7.count ?? 0,
      views30: v30.count ?? 0,
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authList, error: aErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (aErr) throw new Error(aErr.message);
    const users = authList.users;

    const { data: devices } = await supabaseAdmin.from("devices").select("user_id");
    const counts = new Map<string, number>();
    (devices ?? []).forEach((d) => counts.set(d.user_id, (counts.get(d.user_id) ?? 0) + 1));

    // audit
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "admin.list_users",
      entity: "auth.users",
      entity_id: null,
      metadata: { count: users.length } as never,
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      devices: counts.get(u.id) ?? 0,
    }));
  });

export const listPageViewsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(); since.setDate(since.getDate() - 30);

    const { data, error } = await supabaseAdmin
      .from("page_views")
      .select("path, created_at")
      .gte("created_at", since.toISOString())
      .limit(10000);
    if (error) throw new Error(error.message);

    const byDay = new Map<string, number>();
    const byPath = new Map<string, number>();
    (data ?? []).forEach((r) => {
      const day = r.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      byPath.set(r.path, (byPath.get(r.path) ?? 0) + 1);
    });

    const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
    const topPaths = Array.from(byPath.entries()).sort(([, a], [, b]) => b - a).slice(0, 15).map(([path, count]) => ({ path, count }));
    return { days, topPaths };
  });

export const listSupportMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const replySupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; reply: string }) => {
    if (!data?.id) throw new Error("id required");
    const reply = String(data.reply ?? "").trim();
    if (!reply || reply.length > 10000) throw new Error("Réponse invalide (1–10000 caractères)");
    return { id: data.id, reply };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: msg, error: gErr } = await supabaseAdmin
      .from("support_messages")
      .select("id, email, subject, message, status")
      .eq("id", data.id)
      .single();
    if (gErr || !msg) throw new Error(gErr?.message ?? "Message introuvable");

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY missing");

    const escape = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px">Réponse du support PhoneTrack</h2>
        <p style="color:#475569;margin:0 0 8px"><strong>Votre message :</strong></p>
        <blockquote style="border-left:3px solid #cbd5e1;padding:4px 12px;color:#475569;margin:0 0 16px">${escape(msg.message).replace(/\n/g, "<br>")}</blockquote>
        <p style="margin:0 0 8px"><strong>Notre réponse :</strong></p>
        <div style="padding:12px;background:#f1f5f9;border-radius:8px">${escape(data.reply).replace(/\n/g, "<br>")}</div>
        <p style="color:#64748b;font-size:12px;margin-top:24px">— L'équipe PhoneTrack</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "PhoneTrack Support <onboarding@resend.dev>",
        to: [msg.email],
        subject: `Re: ${msg.subject}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend ${res.status}: ${body}`);
    }

    const { error: uErr } = await supabaseAdmin
      .from("support_messages")
      .update({ admin_reply: data.reply, status: "replied", replied_at: new Date().toISOString() })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "admin.reply_support",
      entity: "support_messages",
      entity_id: data.id,
      metadata: { to: msg.email } as never,
    });

    return { ok: true };
  });
