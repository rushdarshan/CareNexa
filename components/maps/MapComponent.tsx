"use client";

/**
 * MapComponent — pure imperative Leaflet (no react-leaflet)
 *
 * react-leaflet v5 uses a React context API that is incompatible with
 * Next.js 13.5's SSR/hydration model and crashes with
 * "render is not a function" from updateContextConsumer.
 *
 * This component bypasses react-leaflet entirely and drives Leaflet
 * imperatively inside useEffect, which has no context issues.
 */

import { useEffect, useRef, useState } from "react";
import { HealthHeatPoint } from "./data/healthData";

interface MapLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: "hospital" | "clinic" | "pharmacy";
}

interface MapComponentProps {
  locations: MapLocation[];
  userLocation: [number, number] | null;
  selectedLocation: MapLocation | null;
  onLocationSelect: (location: MapLocation) => void;
  showHeatMap: boolean;
  heatMapType: string;
  heatMapData: HealthHeatPoint[];
  heatMapGradient?: Record<string, string>;
}

const TYPE_COLOR: Record<string, string> = {
  hospital: "#ef4444",
  clinic: "#8b5cf6",
  pharmacy: "#22c55e",
};

export default function MapComponent({
  locations,
  userLocation,
  selectedLocation,
  onLocationSelect,
  showHeatMap,
  heatMapData,
  heatMapGradient,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Initialize map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (typeof window === "undefined") return;

    let L: any;
    // Dynamically import Leaflet so it is guaranteed to only run on the client
    import("leaflet").then((mod) => {
      L = mod.default;

      // Fix default icon path broken by webpack
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Create map
      const map = L.map(containerRef.current!, {
        center: [28.6139, 77.209],
        zoom: 11,
        zoomControl: true,
      });
      mapRef.current = map;

      // Tile layer
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // Add facility markers
      locations.forEach((loc) => {
        const color = TYPE_COLOR[loc.type] ?? "#3b82f6";
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([loc.lat, loc.lng], { icon })
          .bindPopup(
            `<b>${loc.name}</b><br/>${loc.address}<br/><em class="capitalize">${loc.type}</em>`
          )
          .on("click", () => onLocationSelect(loc))
          .addTo(map);
        markersRef.current.push(marker);
      });
    }).catch((e) => {
      console.error("Failed to load Leaflet:", e);
      setError("Failed to load map library.");
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only runs once on mount

  // ── Fly to selected location ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;
    mapRef.current.flyTo([selectedLocation.lat, selectedLocation.lng], 15, {
      duration: 1.5,
    });
  }, [selectedLocation]);

  // ── Fly to user location ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    import("leaflet").then((mod) => {
      const L = mod.default;
      // Remove previous user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px #3b82f6;"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker(userLocation, { icon })
        .bindPopup("<b>Your Location</b>")
        .addTo(mapRef.current);
      L.circle(userLocation, {
        radius: 1000,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(mapRef.current);
      mapRef.current.flyTo(userLocation, 14, { duration: 1.5 });
    });
  }, [userLocation]);

  // ── Heat map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((mod) => {
      const L = mod.default;
      // Remove existing heat layer
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
      if (!showHeatMap || heatMapData.length === 0) return;
      // @ts-ignore
      import("leaflet.heat").then(() => {
        const points = heatMapData.map((p) => [
          p.lat,
          p.lng,
          Math.min((p.intensity ?? 0.5) * 1.5, 1),
        ]);
        // @ts-ignore
        heatLayerRef.current = L.heatLayer(points, {
          radius: 30,
          blur: 20,
          maxZoom: 18,
          max: 1.0,
          gradient: heatMapGradient ?? {
            0.4: "blue",
            0.6: "lime",
            0.8: "yellow",
            1.0: "red",
          },
          minOpacity: 0.4,
        }).addTo(mapRef.current);
        setTimeout(() => {
          try {
            if (mapRef.current && (mapRef.current as any)._container?.offsetWidth > 0) {
              mapRef.current.invalidateSize();
            }
          } catch (_) { /* ignore canvas size errors when container is not visible */ }
        }, 200);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHeatMap, heatMapData, heatMapGradient]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary rounded-xl">
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%", minHeight: 400 }}
      />
    </>
  );
}