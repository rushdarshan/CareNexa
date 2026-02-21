import { useHealthStore } from "@/lib/store/health-store";
import { useMemo } from "react";

export function useSmartContext() {
    const { vitals, healthVector, userProfile, computeHealthScore } =
        useHealthStore();

    const context = useMemo(() => {
        const recent = vitals.slice(0, 20);
        const latestHR = recent.find((v) => v.type === "heart_rate");
        const latestSpO2 = recent.find((v) => v.type === "spo2");
        const latestSleep = recent.find((v) => v.type === "sleep_score");
        const score = computeHealthScore();

        const lines: string[] = [];

        if (userProfile.age) lines.push(`Age: ${userProfile.age}`);
        if (userProfile.gender) lines.push(`Gender: ${userProfile.gender}`);
        if (userProfile.weight && userProfile.height) {
            const bmi = userProfile.weight / (userProfile.height / 100) ** 2;
            lines.push(
                `BMI: ${bmi.toFixed(1)} (Weight: ${userProfile.weight}kg, Height: ${userProfile.height}cm)`
            );
        }
        if (userProfile.conditions.length)
            lines.push(`Known conditions: ${userProfile.conditions.join(", ")}`);
        if (userProfile.medications.length)
            lines.push(`Medications: ${userProfile.medications.join(", ")}`);

        if (latestHR)
            lines.push(
                `Latest heart rate: ${latestHR.value} bpm (${new Date(latestHR.timestamp).toLocaleDateString()})`
            );
        if (latestSpO2)
            lines.push(
                `Latest SpO2: ${latestSpO2.value}% (${new Date(latestSpO2.timestamp).toLocaleDateString()})`
            );
        if (latestSleep)
            lines.push(`Latest sleep score: ${latestSleep.value}/100`);

        lines.push(`Overall health score: ${score}/100`);
        lines.push(
            `Health status: Cardiovascular ${Math.round(healthVector.cardiovascular * 100)}%, Sleep ${Math.round(healthVector.sleep * 100)}%, Activity ${Math.round(healthVector.activity * 100)}%`
        );

        return lines.join("\n");
    }, [vitals, healthVector, userProfile, computeHealthScore]);

    return context;
}
