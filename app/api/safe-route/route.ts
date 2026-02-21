import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

interface LatLng { lat: number; lng: number; }
interface CommunityPin { lat: number; lng: number; type: "safe" | "caution" | "danger"; description: string; }

function getDistance(p1: LatLng, p2: LatLng): number {
    const R = 6371e3;
    const φ1 = (p1.lat * Math.PI) / 180;
    const φ2 = (p2.lat * Math.PI) / 180;
    const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
    const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolateRoute(start: LatLng, end: LatLng, steps = 8): LatLng[] {
    const points: LatLng[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        points.push({
            lat: start.lat + (end.lat - start.lat) * t,
            lng: start.lng + (end.lng - start.lng) * t,
        });
    }
    return points;
}

export async function POST(req: NextRequest) {
    try {
        const { userLocation, emergencyType = "general", communityPins = [] } = await req.json() as {
            userLocation: LatLng;
            emergencyType: string;
            communityPins: CommunityPin[];
        };

        if (!userLocation?.lat || !userLocation?.lng) {
            return NextResponse.json({ error: "userLocation is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        // Find nearest hospitals with Gemini
        const hospitalsPrompt = `Find the 3 nearest hospitals to coordinates (${userLocation.lat}, ${userLocation.lng}).
Emergency type: ${emergencyType}

For cardiac emergencies, prioritize hospitals with cardiac catheterization labs.
For trauma, prioritize Level 1 trauma centers.
For stroke, prioritize certified stroke centers.
For general, find nearest emergency department.

Return ONLY JSON (no markdown):
{
  "hospitals": [
    {
      "name": "Hospital Name",
      "lat": 0.0,
      "lng": 0.0,
      "distance_km": 1.2,
      "estimated_minutes": 5,
      "specialty": "General/Cardiac/Trauma/Stroke",
      "hasCapability": true
    }
  ]
}`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const hospitalsResult = await model.generateContent(hospitalsPrompt);
        const hospitalsRaw = hospitalsResult.response.text()
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        let hospitals: any[] = [];
        try {
            hospitals = JSON.parse(hospitalsRaw).hospitals || [];
        } catch {
            hospitals = [{
                name: "Nearest Hospital",
                lat: userLocation.lat + 0.01,
                lng: userLocation.lng + 0.01,
                distance_km: 1.5,
                estimated_minutes: 6,
                specialty: "General",
                hasCapability: true,
            }];
        }

        // Score hospitals with danger-avoidance (PathFindHer pattern)
        const dangerPins = communityPins.filter((p) => p.type === "danger");

        const scoredHospitals = hospitals.map((h: any) => {
            const route = interpolateRoute(userLocation, { lat: h.lat, lng: h.lng });
            const dangerCount = route.filter((pt) =>
                dangerPins.some((dp) => getDistance(pt, { lat: dp.lat, lng: dp.lng }) < 200)
            ).length;
            const dangerPenalty = dangerCount * 2;
            const score = h.estimated_minutes + dangerPenalty - (h.hasCapability ? 5 : 0);
            return { ...h, score, dangerCount, route };
        });

        scoredHospitals.sort((a: any, b: any) => a.score - b.score);
        const best = scoredHospitals[0];

        // Generate AI safety note
        const safetyNotePrompt = `A patient needs emergency transport from (${userLocation.lat}, ${userLocation.lng}) to ${best.name}.
Emergency: ${emergencyType}. Estimated time: ${best.estimated_minutes} minutes. Danger zones on route: ${best.dangerCount}.

Write ONE concise safety note (max 20 words). JSON: {"safetyNote": "..."}`;

        const noteResult = await model.generateContent(safetyNotePrompt);
        let safetyNote = "Proceed to hospital immediately. Call 911 if condition worsens.";
        try {
            const noteJson = JSON.parse(
                noteResult.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
            );
            safetyNote = noteJson.safetyNote || safetyNote;
        } catch { }

        return NextResponse.json({
            hospital: best,
            route: best.route,
            safetyNote,
            allHospitals: scoredHospitals,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[API/SAFE-ROUTE ERROR]", error);
        return NextResponse.json({ error: "Routing service unavailable" }, { status: 500 });
    }
}
