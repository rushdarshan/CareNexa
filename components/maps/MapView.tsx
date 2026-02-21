"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { healthDataSets } from "./data/healthData";
import HealthDataStats from "./HealthDataStats";

// ──────────────────────────────────────────────────────────────────────────────
// All Leaflet code lives in MapComponent, loaded client-side only.
// MapView itself must NEVER import leaflet or react-leaflet directly —
// those modules read `window` at parse time and crash SSR.
// ──────────────────────────────────────────────────────────────────────────────
const MapComponent = dynamic(() => import("./MapComponent"), {
  loading: () => <Skeleton className="w-full h-[500px]" />,
  ssr: false,
});

interface MapLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: "hospital" | "clinic" | "pharmacy";
}

const sampleLocations: MapLocation[] = [
  {
    id: "1",
    name: "All India Institute of Medical Sciences (AIIMS)",
    address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi",
    lat: 28.5672,
    lng: 77.21,
    type: "hospital",
  },
  {
    id: "2",
    name: "Apollo Hospitals",
    address: "Sarita Vihar, Delhi Mathura Road, New Delhi",
    lat: 28.5298,
    lng: 77.2905,
    type: "hospital",
  },
  {
    id: "3",
    name: "Fortis Hospital",
    address: "Sector B, Pocket 1, Aruna Asaf Ali Marg, Vasant Kunj",
    lat: 28.5179,
    lng: 77.1613,
    type: "hospital",
  },
  {
    id: "4",
    name: "Max Super Speciality Hospital",
    address: "1, 2, Press Enclave Road, Saket",
    lat: 28.5278,
    lng: 77.2148,
    type: "hospital",
  },
  {
    id: "5",
    name: "Moolchand Medcity",
    address: "Lala Lajpat Rai Marg, Near Defence Colony",
    lat: 28.5685,
    lng: 77.238,
    type: "clinic",
  },
  {
    id: "6",
    name: "Delhi Pharmacy",
    address: "Connaught Place, New Delhi",
    lat: 28.6315,
    lng: 77.2197,
    type: "pharmacy",
  },
];

type HealthDataType = "covid" | "flu" | "healthcare_access";

export function MapView() {
  const [selectedLocation, setSelectedLocation] =
    useState<MapLocation | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [heatMapType, setHeatMapType] = useState<HealthDataType>("covid");

  const dataSet = healthDataSets[heatMapType];
  const heatMapData = dataSet.data;
  const heatMapGradient = dataSet.gradient as Record<string, string>;


  const locateUser = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => console.warn("Geolocation unavailable")
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={locateUser}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          📍 Locate Me
        </button>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showHeatMap}
            onChange={(e) => setShowHeatMap(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Show Health Heat Map
        </label>
        {showHeatMap && (
          <select
            value={heatMapType}
            onChange={(e) => setHeatMapType(e.target.value as HealthDataType)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-xl text-sm text-foreground"
          >
            <option value="covid">COVID-19</option>
            <option value="flu">Flu</option>
            <option value="healthcare_access">Healthcare Access</option>
          </select>
        )}
      </div>

      {/* Map — all Leaflet code isolated inside MapComponent (ssr: false) */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 500 }}>
        <MapComponent
          locations={sampleLocations}
          userLocation={userLocation}
          selectedLocation={selectedLocation}
          onLocationSelect={setSelectedLocation}
          showHeatMap={showHeatMap}
          heatMapType={heatMapType}
          heatMapData={heatMapData}
          heatMapGradient={heatMapGradient}
        />
      </div>

      {/* Stats */}
      <HealthDataStats
        dataType={heatMapType}
        data={heatMapData}
        isVisible={showHeatMap}
      />
    </div>
  );
}