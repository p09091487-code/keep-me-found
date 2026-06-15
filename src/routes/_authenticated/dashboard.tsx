import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, MapPin, Smartphone, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { DeviceMap, type MapMarker } from "@/components/device-map";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — PhoneTrack" }] }),
  component: Dashboard,
});

interface Device {
  id: string;
  imei: string;
  brand: string;
  model: string;
  alias: string | null;
  status: "safe" | "lost" | "stolen";
}
interface Position {
  device_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

const statusLabel = { safe: "En sécurité", lost: "Perdu", stolen: "Volé" } as const;
const statusVariant = { safe: "secondary", lost: "default", stolen: "destructive" } as const;

function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const { data: devs, error } = await supabase.from("devices").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setDevices((devs ?? []) as Device[]);
    if (devs && devs.length) {
      const ids = devs.map((d) => d.id);
      const { data: pos } = await supabase.from("positions").select("device_id, latitude, longitude, recorded_at")
        .in("device_id", ids).order("recorded_at", { ascending: false });
      const map: Record<string, Position> = {};
      (pos ?? []).forEach((p) => { if (!map[p.device_id]) map[p.device_id] = p as Position; });
      setPositions(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("positions-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "positions" }, (payload) => {
        const p = payload.new as Position;
        setPositions((prev) => ({ ...prev, [p.device_id]: p }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markers: MapMarker[] = devices
    .map((d) => {
      const p = positions[d.id];
      if (!p) return null;
      return { id: d.id, lat: p.latitude, lng: p.longitude, label: `${d.alias ?? d.brand + " " + d.model} — ${statusLabel[d.status]}`, status: d.status };
    })
    .filter(Boolean) as MapMarker[];

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteNav />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Mes appareils</h1>
            <p className="text-sm text-muted-foreground">Suivez la position de vos téléphones en temps réel.</p>
          </div>
          <Button asChild><Link to="/devices/new"><Plus className="mr-1 h-4 w-4" />Ajouter un appareil</Link></Button>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-sm">
          {markers.length > 0 ? (
            <DeviceMap markers={markers} height={420} />
          ) : (
            <div className="flex h-[420px] flex-col items-center justify-center text-center text-muted-foreground">
              <MapPin className="mb-2 h-10 w-10 opacity-40" />
              <p>Aucune position enregistrée pour le moment.</p>
              <p className="text-xs">Les positions apparaissent dès qu'un appareil compagnon les transmet.</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : devices.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 font-semibold">Aucun appareil enregistré</h3>
            <p className="mt-1 text-sm text-muted-foreground">Commencez par ajouter votre premier téléphone via son IMEI.</p>
            <Button asChild className="mt-4"><Link to="/devices/new"><Plus className="mr-1 h-4 w-4" />Ajouter un appareil</Link></Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {devices.map((d) => {
              const p = positions[d.id];
              return (
                <Link key={d.id} to="/devices/$id" params={{ id: d.id }} className="group rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold group-hover:text-primary">{d.alias ?? `${d.brand} ${d.model}`}</h3>
                      <p className="text-xs text-muted-foreground">{d.brand} {d.model}</p>
                    </div>
                    <Badge variant={statusVariant[d.status]}>
                      {d.status !== "safe" && <ShieldAlert className="mr-1 h-3 w-3" />}{statusLabel[d.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    <p className="font-mono text-muted-foreground">IMEI : {d.imei}</p>
                    <p className="text-muted-foreground">
                      Dernière position : {p ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)} • ${new Date(p.recorded_at).toLocaleString("fr-FR")}` : "aucune"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
