import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Réinitialiser le mot de passe — PhoneTrack" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Mot de passe : 8 caractères minimum");
    if (pwd !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour !");
    navigate({ to: "/dashboard" });
  };

  return (
    <>
      <SiteNav />
      <div className="container mx-auto flex items-center justify-center px-4 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
          <div><Label htmlFor="np">Nouveau mot de passe</Label>
            <Input id="np" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required /></div>
          <div><Label htmlFor="nc">Confirmer</Label>
            <Input id="nc" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Mettre à jour
          </Button>
        </form>
      </div>
    </>
  );
}
