import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidImei } from "@/lib/luhn";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteNav } from "@/components/site-nav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/devices/new")({
  head: () => ({ meta: [{ title: "Ajouter un appareil — PhoneTrack" }] }),
  component: NewDevice,
});

const schema = z.object({
  imei: z.string().regex(/^\d{15}$/, "L'IMEI doit contenir exactement 15 chiffres"),
  brand: z.string().trim().min(1, "Marque requise").max(50),
  model: z.string().trim().min(1, "Modèle requis").max(50),
  alias: z.string().trim().max(50).optional(),
});

function NewDevice() {
  const navigate = useNavigate();
  const [imei, setImei] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [alias, setAlias] = useState("");
  const [legal, setLegal] = useState(false);
  const [loading, setLoading] = useState(false);

  const imeiValidLuhn = imei.length === 15 && isValidImei(imei);
  const imeiError = imei.length === 15 && !imeiValidLuhn ? "IMEI invalide (échec contrôle Luhn)" : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legal) return toast.error("Vous devez certifier être le propriétaire légal");
    const parsed = schema.safeParse({ imei, brand, model, alias: alias || undefined });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!isValidImei(parsed.data.imei)) return toast.error("IMEI invalide (Luhn)");

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase.from("devices").insert({
      user_id: user.id,
      imei: parsed.data.imei,
      brand: parsed.data.brand,
      model: parsed.data.model,
      alias: parsed.data.alias ?? null,
      legal_owner_confirmed: true,
    }).select().single();

    setLoading(false);
    if (error) {
      if (error.code === "23505") return toast.error("Cet IMEI est déjà enregistré");
      return toast.error(error.message);
    }
    await logAudit("device.create", "device", data.id, { imei: parsed.data.imei });
    toast.success("Appareil enregistré");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteNav />
      <main className="container mx-auto max-w-xl px-4 py-8">
        <Button variant="ghost" asChild className="mb-4"><Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Retour</Link></Button>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold">Ajouter un appareil</h1>

          <div>
            <Label htmlFor="imei">IMEI (15 chiffres)</Label>
            <Input id="imei" inputMode="numeric" maxLength={15} value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, ""))}
              className={imeiError ? "border-destructive" : imeiValidLuhn ? "border-green-500" : ""} required />
            <p className="mt-1 text-xs text-muted-foreground">
              Composez *#06# sur votre téléphone pour afficher l'IMEI.
            </p>
            {imeiError && <p className="mt-1 text-xs text-destructive">{imeiError}</p>}
            {imeiValidLuhn && <p className="mt-1 text-xs text-green-600">IMEI valide ✓</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="brand">Marque</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Apple, Samsung…" required /></div>
            <div><Label htmlFor="model">Modèle</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="iPhone 15" required /></div>
          </div>

          <div>
            <Label htmlFor="alias">Surnom (optionnel)</Label>
            <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Téléphone pro" />
          </div>

          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <Checkbox id="legal" checked={legal} onCheckedChange={(v) => setLegal(!!v)} />
            <Label htmlFor="legal" className="text-xs leading-tight">
              Je certifie être le propriétaire légal de cet appareil et j'autorise sa localisation par PhoneTrack.
            </Label>
          </div>

          <Button type="submit" disabled={loading || !imeiValidLuhn} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
          </Button>
        </form>
      </main>
    </div>
  );
}
