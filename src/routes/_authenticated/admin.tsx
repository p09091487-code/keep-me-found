import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminStats,
  listAdminUsers,
  listPageViewsSummary,
  listSupportMessages,
  replySupportMessage,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    // Silent guard: any failure or non-admin -> redirect to "/" without hint.
    try {
      const { data, error } = await supabase.rpc("is_app_admin");
      if (error || data !== true) throw redirect({ to: "/" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
      throw redirect({ to: "/" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const stats = useServerFn(getAdminStats);
  const users = useServerFn(listAdminUsers);
  const views = useServerFn(listPageViewsSummary);
  const msgs = useServerFn(listSupportMessages);

  const statsQ = useQuery({ queryKey: ["admin", "stats"], queryFn: () => stats() });
  const usersQ = useQuery({ queryKey: ["admin", "users"], queryFn: () => users() });
  const viewsQ = useQuery({ queryKey: ["admin", "views"], queryFn: () => views() });
  const msgsQ = useQuery({ queryKey: ["admin", "msgs"], queryFn: () => msgs() });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="container mx-auto flex-1 px-4 py-8">
        <h1 className="text-3xl font-bold">Administration</h1>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Kpi label="Utilisateurs" value={statsQ.data?.users} />
          <Kpi label="Appareils" value={statsQ.data?.devices} />
          <Kpi label="Support ouvert" value={statsQ.data?.openSupport} />
          <Kpi label="Visites (jour)" value={statsQ.data?.viewsToday} />
          <Kpi label="Visites (7j)" value={statsQ.data?.views7} />
          <Kpi label="Visites (30j)" value={statsQ.data?.views30} />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Utilisateurs</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Email</th>
                  <th className="p-2">Inscrit le</th>
                  <th className="p-2">Dernière connexion</th>
                  <th className="p-2">Appareils</th>
                </tr>
              </thead>
              <tbody>
                {(usersQ.data ?? []).map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{new Date(u.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-2">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "—"}</td>
                    <td className="p-2">{u.devices}</td>
                  </tr>
                ))}
                {usersQ.data && usersQ.data.length === 0 && (
                  <tr><td className="p-4 text-center text-muted-foreground" colSpan={4}>Aucun utilisateur</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Visites (30 derniers jours)</h2>
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left"><tr><th className="p-2">Jour</th><th className="p-2">Vues</th></tr></thead>
                <tbody>
                  {(viewsQ.data?.days ?? []).slice().reverse().map((d) => (
                    <tr key={d.day} className="border-t"><td className="p-2">{d.day}</td><td className="p-2">{d.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Pages les plus visitées</h2>
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left"><tr><th className="p-2">Chemin</th><th className="p-2">Vues</th></tr></thead>
                <tbody>
                  {(viewsQ.data?.topPaths ?? []).map((p) => (
                    <tr key={p.path} className="border-t"><td className="p-2 truncate max-w-[240px]">{p.path}</td><td className="p-2">{p.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Messagerie support</h2>
          <div className="mt-3 space-y-3">
            {(msgsQ.data ?? []).map((m) => (
              <SupportRow key={m.id} m={m} />
            ))}
            {msgsQ.data && msgsQ.data.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun message.</p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value ?? "—"}</div>
    </div>
  );
}

type SupportMessage = {
  id: string;
  email: string;
  name: string | null;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
};

function SupportRow({ m }: { m: SupportMessage }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const qc = useQueryClient();
  const send = useServerFn(replySupportMessage);
  const mut = useMutation({
    mutationFn: (r: string) => send({ data: { id: m.id, reply: r } }),
    onSuccess: () => {
      toast.success("Réponse envoyée");
      setOpen(false);
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{m.subject}</div>
          <div className="text-xs text-muted-foreground">
            {m.name ? `${m.name} · ` : ""}{m.email} · {new Date(m.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${m.status === "open" ? "bg-red-100 text-red-700" : m.status === "replied" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
          {m.status}
        </span>
      </div>
      <button className="mt-2 text-sm text-primary hover:underline" onClick={() => setOpen(!open)}>
        {open ? "Fermer" : "Ouvrir"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{m.message}</div>
          {m.admin_reply && (
            <div>
              <div className="text-xs text-muted-foreground">Réponse envoyée le {m.replied_at ? new Date(m.replied_at).toLocaleString("fr-FR") : ""}</div>
              <div className="mt-1 whitespace-pre-wrap rounded-md bg-green-50 p-3 text-sm text-green-900">{m.admin_reply}</div>
            </div>
          )}
          {m.status !== "closed" && (
            <div>
              <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={10000} placeholder="Votre réponse (envoyée par e-mail)…" />
              <div className="mt-2 flex gap-2">
                <Button size="sm" disabled={mut.isPending || !reply.trim()} onClick={() => mut.mutate(reply)}>
                  {mut.isPending ? "Envoi…" : "Envoyer la réponse"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
