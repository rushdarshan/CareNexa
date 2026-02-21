"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Sparkles, X, ShieldCheck, AlertTriangle, XCircle, Loader2, Navigation } from "lucide-react";
import { useHealthStore } from "@/lib/store/health-store";
import type { CommunityPin } from "@/lib/store/health-store";

type PinType = "safe" | "caution" | "danger";
type PinCategory = "outbreak" | "pollution" | "water" | "clinic" | "pharmacy" | "general";

const PIN_COLORS: Record<PinType, string> = { safe: "#22c55e", caution: "#f59e0b", danger: "#ef4444" };
const PIN_ICONS: Record<PinType, typeof ShieldCheck> = { safe: ShieldCheck, caution: AlertTriangle, danger: XCircle };

interface EnvironmentScan {
    text: string;
    safePlaces: { name: string; type: string; address: string }[];
    loading: boolean;
}

// --- Leaflet Map Sub-Component ---
function CommunityLeafletMap({
    userLocation,
    pins,
}: {
    userLocation: { lat: number; lng: number } | null;
    pins: CommunityPin[];
}) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        let L: any;

        const init = async () => {
            try {
                L = await import("leaflet");
                await import("leaflet/dist/leaflet.css" as any);

                const center = userLocation ?? { lat: 40.7128, lng: -74.006 };

                const map = L.map(mapContainerRef.current!, {
                    center: [center.lat, center.lng],
                    zoom: 14,
                    zoomControl: true,
                    attributionControl: true,
                });
                mapRef.current = map;

                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "© OpenStreetMap contributors",
                    maxZoom: 19,
                }).addTo(map);

                // User location marker
                if (userLocation) {
                    const userIcon = L.divIcon({
                        className: "",
                        html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.35);animation:pulse-map 2s infinite"></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8],
                    });
                    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                        .addTo(map)
                        .bindPopup("<b>Your Location</b>");
                    L.circle([userLocation.lat, userLocation.lng], {
                        radius: 100,
                        color: "#3b82f6",
                        fillColor: "#3b82f6",
                        fillOpacity: 0.08,
                        weight: 1,
                    }).addTo(map);
                }

                // Community pins
                pins.forEach((pin: CommunityPin) => {
                    const color = PIN_COLORS[pin.type as PinType];
                    const pinIcon = L.divIcon({
                        className: "",
                        html: `<div style="width:24px;height:24px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><div style="transform:rotate(45deg);width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div></div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 24],
                    });

                    const directionsUrl = userLocation
                        ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${pin.lat},${pin.lng}&travelmode=driving`
                        : `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;

                    L.marker([pin.lat, pin.lng], { icon: pinIcon })
                        .addTo(map)
                        .bindPopup(
                            `<div style="min-width:180px;font-family:sans-serif">
                <strong style="color:${color};text-transform:capitalize">${pin.type} — ${pin.category}</strong><br/>
                <span style="font-size:12px">${pin.description}</span><br/>
                <small style="color:#888">${new Date(pin.timestamp).toLocaleDateString()}</small><br/>
                <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:4px 10px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600">
                  🧭 Get Directions
                </a>
              </div>`
                        );
                });

                setTimeout(() => {
                    try {
                        if (mapContainerRef.current && mapContainerRef.current.offsetWidth > 0) {
                            map.invalidateSize();
                        }
                    } catch (_) { }
                }, 200);
            } catch (err) {
                console.error("Map init failed:", err);
            }
        };

        init();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update pins when they change
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Remove old pin layers and re-add (simple approach)
        // We rely on the map being re-initialized with fresh pins; the initial mount already handles this.
        // For dynamic updates we would need a separate layers ref — future enhancement.
    }, [pins]);

    return (
        <>
            <style>{`
        @keyframes pulse-map {
          0%,100%{box-shadow:0 0 0 3px rgba(59,130,246,0.35)}
          50%{box-shadow:0 0 0 8px rgba(59,130,246,0.1)}
        }
        .leaflet-container { background: #1e293b; }
      `}</style>
            <div ref={mapContainerRef} className="w-full h-full" />
        </>
    );
}

// --- Main Export ---
export function CommunityHealthMap() {
    const { communityPins, addCommunityPin, removeCommunityPin, addVitaPoints, completeQuestTask } = useHealthStore();
    const [mode, setMode] = useState<"view" | "report" | "scan">("view");
    const [newPin, setNewPin] = useState<Partial<{ type: PinType; category: PinCategory; description: string; lat: number; lng: number }>>({});
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [scan, setScan] = useState<EnvironmentScan>({ text: "", safePlaces: [], loading: false });

    useEffect(() => {
        navigator.geolocation?.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => setUserLocation({ lat: 40.7128, lng: -74.006 }) // NYC fallback
        );
    }, []);

    const scanArea = async () => {
        if (!userLocation) return;
        setScan((s) => ({ ...s, loading: true }));
        setMode("scan");
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `Scan the health environment at coordinates (${userLocation.lat}, ${userLocation.lng}). List nearby hospitals, pharmacies, and clinics. Report any known health hazards, pollution, or disease outbreaks in this area. Provide AQI estimate if available.`,
                    agentType: "general",
                }),
            });
            const data = await res.json();
            setScan({ text: data.response || "Unable to scan area.", safePlaces: [], loading: false });
            addVitaPoints(25);
        } catch {
            setScan({ text: "Unable to reach AI service. Please try again.", safePlaces: [], loading: false });
        }
    };

    const submitPin = () => {
        if (!newPin.type || !newPin.description || !userLocation) return;
        addCommunityPin({
            lat: newPin.lat ?? userLocation.lat + (Math.random() - 0.5) * 0.01,
            lng: newPin.lng ?? userLocation.lng + (Math.random() - 0.5) * 0.01,
            type: newPin.type,
            category: newPin.category ?? "general",
            description: newPin.description,
            timestamp: new Date().toISOString(),
        });
        addVitaPoints(100);
        completeQuestTask("q2", `Report first hazard`);
        setNewPin({});
        setMode("view");
    };

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Community Health Map
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {communityPins.length} community reports · {userLocation ? "Location active" : "Getting location..."}
                    </p>
                </div>
                <button
                    onClick={scanArea}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Scan Area
                </button>
            </div>

            {/* Real Leaflet Map */}
            <div className="relative h-64 overflow-hidden">
                <CommunityLeafletMap userLocation={userLocation} pins={communityPins} />

                {/* Location loading overlay */}
                {!userLocation && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                        <div className="text-center text-white">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            <p className="text-xs">Getting your location…</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 space-y-3">
                {/* Legend */}
                <div className="flex gap-4">
                    {(["safe", "caution", "danger"] as PinType[]).map((t) => {
                        const Icon = PIN_ICONS[t];
                        return (
                            <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                                <Icon className="w-3.5 h-3.5" style={{ color: PIN_COLORS[t] }} />
                                {t}
                                <span className="font-semibold text-foreground">{communityPins.filter((p) => p.type === t).length}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Report button */}
                <button
                    onClick={() => setMode(mode === "report" ? "view" : "report")}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-primary/40 text-primary text-sm font-semibold rounded-xl hover:bg-primary/5 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Report Health Hazard (+100 VP)
                </button>

                {/* Report form */}
                <AnimatePresence>
                    {mode === "report" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-3 overflow-hidden"
                        >
                            <div className="grid grid-cols-3 gap-2">
                                {(["safe", "caution", "danger"] as PinType[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setNewPin((p) => ({ ...p, type: t }))}
                                        className={`py-2 rounded-xl text-xs font-semibold border-2 capitalize transition-all ${newPin.type === t ? "border-current" : "border-border opacity-60"
                                            }`}
                                        style={{ color: PIN_COLORS[t], borderColor: newPin.type === t ? PIN_COLORS[t] : undefined }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <select
                                value={newPin.category || ""}
                                onChange={(e) => setNewPin((p) => ({ ...p, category: e.target.value as PinCategory }))}
                                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                            >
                                <option value="">Select category...</option>
                                <option value="outbreak">Disease Outbreak</option>
                                <option value="pollution">Air/Water Pollution</option>
                                <option value="water">Water Contamination</option>
                                <option value="clinic">Clinic/Hospital</option>
                                <option value="pharmacy">Pharmacy</option>
                                <option value="general">General</option>
                            </select>
                            <textarea
                                value={newPin.description || ""}
                                onChange={(e) => setNewPin((p) => ({ ...p, description: e.target.value }))}
                                placeholder="Describe the health situation (e.g. 'Dengue cases reported in this area')"
                                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none h-20"
                            />
                            <div className="flex gap-2">
                                <button onClick={submitPin} className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                                    Submit Report
                                </button>
                                <button onClick={() => { setMode("view"); setNewPin({}); }} className="px-4 py-2 bg-secondary text-muted-foreground text-sm rounded-xl hover:bg-muted transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI Area Scan Results */}
                <AnimatePresence>
                    {mode === "scan" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="bg-secondary rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    AI Environmental Health Scan
                                </div>
                                <button onClick={() => setMode("view")} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {scan.loading ? (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Scanning your area...
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{scan.text}</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Recent pins */}
                {communityPins.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Reports</h4>
                        {communityPins.slice(0, 3).map((pin) => {
                            const Icon = PIN_ICONS[pin.type as PinType];
                            const directionsUrl = userLocation
                                ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${pin.lat},${pin.lng}&travelmode=driving`
                                : `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;
                            return (
                                <div key={pin.id} className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
                                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: PIN_COLORS[pin.type as PinType] + "20" }}>
                                        <Icon className="w-4 h-4" style={{ color: PIN_COLORS[pin.type as PinType] }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground line-clamp-2">{pin.description}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(pin.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <a
                                            href={directionsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-400 transition-colors"
                                            title="Get Directions"
                                        >
                                            <Navigation className="w-4 h-4" />
                                        </a>
                                        <button onClick={() => removeCommunityPin(pin.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
