import { useEffect, useRef } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  status?: "safe" | "lost" | "stolen";
}

export interface Geofence {
  lat: number;
  lng: number;
  radius_m: number;
}

interface Props {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: number;
  geofence?: Geofence | null;
  trail?: { lat: number; lng: number }[];
}


/**
 * Carte Leaflet (chargée dynamiquement, side client uniquement).
 * Affiche les positions + éventuellement une zone de confiance (cercle).
 */
export function DeviceMap({ markers, center = [46.5, 2.5], zoom = 5, height = 400, geofence = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const geofenceLayerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView(center, zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
        markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
        geofenceLayerRef.current = L.layerGroup().addTo(mapRef.current);
      }

      // Positions
      markerLayerRef.current.clearLayers();
      const bounds: [number, number][] = [];
      markers.forEach((m) => {
        const color = m.status === "stolen" ? "#dc2626" : m.status === "lost" ? "#f59e0b" : "#2563eb";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color}55;"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(markerLayerRef.current);
        if (m.label) marker.bindPopup(m.label);
        bounds.push([m.lat, m.lng]);
      });

      // Geofence (cercle + point central)
      geofenceLayerRef.current.clearLayers();
      if (geofence && Number.isFinite(geofence.lat) && Number.isFinite(geofence.lng)) {
        L.circle([geofence.lat, geofence.lng], {
          radius: geofence.radius_m,
          color: "#16a34a",
          weight: 2,
          fillColor: "#16a34a",
          fillOpacity: 0.12,
        }).addTo(geofenceLayerRef.current).bindPopup(`Zone de confiance — rayon ${geofence.radius_m} m`);
        L.circleMarker([geofence.lat, geofence.lng], {
          radius: 5, color: "#16a34a", fillColor: "#16a34a", fillOpacity: 1,
        }).addTo(geofenceLayerRef.current);
        bounds.push([geofence.lat, geofence.lng]);
      }

      if (bounds.length === 1) mapRef.current.setView(bounds[0], 14);
      else if (bounds.length > 1) mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    })();
    return () => { cancelled = true; };
  }, [markers, center, zoom, geofence?.lat, geofence?.lng, geofence?.radius_m]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }} />;
}
