import { useState, useCallback } from "react";
import type { HealthInsightsResponse } from "@/app/api/health-insights/route";
import { useHealthStore } from "@/lib/store/health-store";

interface InsightsParams {
    heartRate: number;
    oxygenLevel: number;
    age?: number;
    gender?: string;
    activityLevel?: string;
    sleepHours?: number;
}

export function useHealthInsights() {
    const [data, setData] = useState<HealthInsightsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { userProfile, updateHealthVector, addVitaPoints, completeQuestTask } =
        useHealthStore();

    const fetchInsights = useCallback(
        async (params: InsightsParams) => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/health-insights", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...params,
                        age: params.age ?? userProfile.age,
                        gender: params.gender ?? userProfile.gender,
                        medications: userProfile.medications,
                        conditions: userProfile.conditions,
                    }),
                });

                if (!res.ok) throw new Error("Failed to fetch insights");

                const result: HealthInsightsResponse = await res.json();
                setData(result);

                if (result.healthVector) {
                    updateHealthVector(result.healthVector);
                }

                addVitaPoints(50);
                completeQuestTask("q3", "Get health score analysis");

                return result;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [userProfile, updateHealthVector, addVitaPoints, completeQuestTask]
    );

    return { data, loading, error, fetchInsights };
}
