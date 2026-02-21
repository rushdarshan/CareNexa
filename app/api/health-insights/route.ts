import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export interface HealthInsightsResponse {
    insights: string[];
    recommendations: string[];
    riskFactors: string[];
    score: number; // 0–100
    healthVector: {
        cardiovascular: number;
        metabolic: number;
        respiratory: number;
        mental_health: number;
        sleep: number;
        activity: number;
        nutrition: number;
        stress: number;
    };
    overallStatus: "excellent" | "good" | "fair" | "poor" | "critical";
    fallback: boolean;
}

function getFallbackInsights(heartRate: number, oxygenLevel: number): HealthInsightsResponse {
    const hrNormal = heartRate >= 60 && heartRate <= 100;
    const spo2Normal = oxygenLevel >= 95;
    const score = hrNormal && spo2Normal ? 75 : hrNormal || spo2Normal ? 60 : 40;
    return {
        insights: [
            hrNormal ? "Heart rate is within normal range." : `Heart rate of ${heartRate} bpm is outside normal range (60–100 bpm).`,
            spo2Normal ? "Blood oxygen level is healthy." : `SpO2 of ${oxygenLevel}% is below recommended levels (≥95%).`,
        ],
        recommendations: [
            "Stay hydrated with 8+ glasses of water daily.",
            "Aim for 7–9 hours of quality sleep.",
            "Engage in at least 30 minutes of moderate activity daily.",
        ],
        riskFactors: !hrNormal ? ["Abnormal heart rate detected"] : !spo2Normal ? ["Low blood oxygen"] : [],
        score,
        healthVector: {
            cardiovascular: hrNormal ? 0.8 : 0.4,
            metabolic: 0.7,
            respiratory: spo2Normal ? 0.85 : 0.5,
            mental_health: 0.7,
            sleep: 0.65,
            activity: 0.6,
            nutrition: 0.65,
            stress: 0.7,
        },
        overallStatus: score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 50 ? "fair" : "poor",
        fallback: true,
    };
}

export async function POST(req: NextRequest) {
    let body: any = {};
    try {
        body = await req.json();
        const { heartRate, oxygenLevel, age, gender, activityLevel, sleepHours, medications, conditions } = body;

        if (!heartRate || !oxygenLevel) {
            return NextResponse.json({ error: "heartRate and oxygenLevel are required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(getFallbackInsights(heartRate, oxygenLevel));
        }

        const prompt = `You are a medical AI analyst. Analyze these health vitals and return ONLY valid JSON.

VITALS:
- Heart Rate: ${heartRate} bpm
- Blood Oxygen (SpO2): ${oxygenLevel}%
- Age: ${age || "unknown"}
- Gender: ${gender || "unknown"}
- Activity Level: ${activityLevel || "moderate"}
- Sleep Hours: ${sleepHours || "unknown"} hours/night
- Current Medications: ${medications?.join(", ") || "none"}
- Known Conditions: ${conditions?.join(", ") || "none"}

Return this EXACT JSON structure (no markdown, no explanation):
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "riskFactors": ["risk1"],
  "score": 75,
  "healthVector": {
    "cardiovascular": 0.8,
    "metabolic": 0.7,
    "respiratory": 0.85,
    "mental_health": 0.7,
    "sleep": 0.65,
    "activity": 0.6,
    "nutrition": 0.65,
    "stress": 0.7
  },
  "overallStatus": "good"
}

All healthVector values are 0.0 (worst) to 1.0 (best). Score is 0-100.`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();

        // Clean up any markdown code blocks
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned) as Omit<HealthInsightsResponse, "fallback">;

        return NextResponse.json({ ...parsed, fallback: false });
    } catch (error) {
        console.error("[API/HEALTH-INSIGHTS ERROR]", error);
        const { heartRate = 72, oxygenLevel = 98 } = body;
        return NextResponse.json(getFallbackInsights(heartRate, oxygenLevel));
    }
}
