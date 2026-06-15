import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Mon compte — PhoneTrack" }] }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
      setName(p?.full_name ?? "");
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.")) return;
    setDeleting(true);
    try {
      await deleteFn();
      await supabase.auth.signOut();
      toast.success("Compte supprimé");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteNav />
      <main className="container mx-auto max-w-xl space-y-6 px-4 py-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="mb-4 text-xl font-bold">Mon compte</h1>
          <div className="space-y-3">
            <div><Label>Adresse e-mail</Label><Input value={email} disabled /></div>
            <div><Label htmlFor="name">Nom complet</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-destructive/40 bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-destructive">Zone de danger</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suppression définitive de votre compte et de toutes vos données (droit à l'oubli RGPD).
          </p>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="mt-3">
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Supprimer mon compte
          </Button>
        </div>
      </main>
    </div>
  );
}
