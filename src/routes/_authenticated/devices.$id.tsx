import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Trash2, Save, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteNav } from "@/components/site-nav";
import { DeviceMap, type MapMarker } from "@/components/device-map";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/devices/$id")({
  head: () => ({ meta: [{ title: "Appareil — PhoneTrack" }] }),
  component: DeviceDetail,
});

interface Device {
  id: string;
  imei: string;
  brand: string;
  model: string;
  alias: string | null;
  status: "safe" | "lost" | "stolen";
  home_lat: number | null;
  home_lng: number | null;
  home_radius_m: number;
  alert_email_enabled: boolean;
}
interface Position { id: string; latitude: number; longitude: number; recorded_at: string; }

function DeviceDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: d, error } = await supabase.from("devices").select("*").eq("id", id).maybeSingle();
    if (error || !d) { toast.error("Appareil introuvable"); navigate({ to: "/dashboard" }); return; }
    setDevice(d as Device);
    const { data: pos } = await supabase.from("positions").select("*").eq("device_id", id).order("recorded_at", { ascending: false }).limit(50);
    setPositions((pos ?? []) as Position[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel(`positions-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "positions", filter: `device_id=eq.${id}` }, (p) => {
        setPositions((prev) => [p.new as Position, ...prev]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const save = async () => {
    if (!device) return;
    setSaving(true);
    const { error } = await supabase.from("devices").update({
      alias: device.alias,
      status: device.status,
      home_lat: device.home_lat,
      home_lng: device.home_lng,
      home_radius_m: device.home_radius_m,
      alert_email_enabled: device.alert_email_enabled,
    }).eq("id", device.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit("device.update", "device", device.id, { status: device.status });
    toast.success("Modifications enregistrées");
  };

  const useCurrentAsHome = () => {
    if (!device) return;
    if (!navigator.geolocation) return toast.error("Géolocalisation non disponible");
    navigator.geolocation.getCurrentPosition((pos) => {
      setDevice({ ...device, home_lat: pos.coords.latitude, home_lng: pos.coords.longitude });
      toast.success("Zone définie sur votre position actuelle");
    }, () => toast.error("Permission refusée"));
  };

  const remove = async () => {
    if (!device) return;
    if (!confirm("Supprimer cet appareil et son historique ?")) return;
    const { error } = await supabase.from("devices").delete().eq("id", device.id);
    if (error) return toast.error(error.message);
    await logAudit("device.delete", "device", device.id);
    toast.success("Appareil supprimé");
    navigate({ to: "/dashboard" });
  };

  // Demo : envoyer une position manuelle (utile en attendant l'app compagnon)
  const addDemoPosition = async () => {
    if (!device) return;
    if (!navigator.geolocation) return toast.error("Géolocalisation non disponible");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { error } = await supabase.from("positions").insert({
        device_id: device.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      if (error) return toast.error(error.message);
      toast.success("Position ajoutée");
    }, () => toast.error("Permission refusée"));
  };

  if (loading || !device) {
    return (
      <div className="min-h-screen bg-muted/20">
        <SiteNav />
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  const markers: MapMarker[] = positions.length
    ? [{ id: positions[0].id, lat: positions[0].latitude, lng: positions[0].longitude, label: device.alias ?? `${device.brand} ${device.model}`, status: device.status }]
    : [];

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteNav />
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Button variant="ghost" asChild><Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Retour</Link></Button>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="text-xl font-bold">{device.alias ?? `${device.brand} ${device.model}`}</h1>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Marque : <span className="text-foreground">{device.brand}</span></p>
              <p>Modèle : <span className="text-foreground">{device.model}</span></p>
              <p>IMEI : <span className="font-mono text-foreground">{device.imei}</span></p>
            </div>
            <div>
              <Label htmlFor="alias">Surnom</Label>
              <Input id="alias" value={device.alias ?? ""} onChange={(e) => setDevice({ ...device, alias: e.target.value })} />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={device.status} onValueChange={(v) => setDevice({ ...device, status: v as Device["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">En sécurité</SelectItem>
                  <SelectItem value="lost">Perdu</SelectItem>
                  <SelectItem value="stolen">Volé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Enregistrer
              </Button>
              <Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3 shadow-sm">
            {markers.length > 0 ? (
              <DeviceMap markers={markers} height={300} />
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                <MapPin className="mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">Aucune position enregistrée.</p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={addDemoPosition} className="mt-3 w-full">
              <MapPin className="mr-1 h-4 w-4" />Envoyer ma position actuelle (test)
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> Zone de confiance & alertes
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Définissez le point central et le rayon de la zone de confiance de votre appareil. Si son statut est <em>Perdu</em> ou <em>Volé</em> et qu'il sort de cette zone, vous recevez une alerte par e-mail.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="hlat">Latitude</Label>
              <Input id="hlat" type="number" step="any" value={device.home_lat ?? ""} onChange={(e) => setDevice({ ...device, home_lat: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="hlng">Longitude</Label>
              <Input id="hlng" type="number" step="any" value={device.home_lng ?? ""} onChange={(e) => setDevice({ ...device, home_lng: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="hrad">Rayon (m)</Label>
              <Input id="hrad" type="number" min={50} step={50} value={device.home_radius_m} onChange={(e) => setDevice({ ...device, home_radius_m: Number(e.target.value) || 500 })} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={device.alert_email_enabled} onChange={(e) => setDevice({ ...device, alert_email_enabled: e.target.checked })} />
              Recevoir une alerte e-mail si l'appareil quitte la zone
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={useCurrentAsHome}>
                <MapPin className="mr-1 h-4 w-4" />Utiliser ma position
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Enregistrer
              </Button>
            </div>
          </div>
        </div>


        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">Historique des positions</h2>
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune position enregistrée.</p>
          ) : (
            <ul className="divide-y text-sm">
              {positions.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span className="font-mono">{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</span>
                  <span className="text-muted-foreground">{new Date(p.recorded_at).toLocaleString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
