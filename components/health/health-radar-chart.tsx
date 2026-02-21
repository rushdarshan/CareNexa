"use client";

import { ResponsiveRadar } from "@nivo/radar";
import { useHealthStore } from "@/lib/store/health-store";
import { motion } from "framer-motion";

const IDEAL_VECTOR = {
    cardiovascular: 1,
    metabolic: 1,
    respiratory: 1,
    mental_health: 1,
    sleep: 1,
    activity: 1,
    nutrition: 1,
    stress: 1,
};

const AXIS_LABELS: Record<string, string> = {
    cardiovascular: "Cardio",
    metabolic: "Metabolic",
    respiratory: "Respiratory",
    mental_health: "Mental",
    sleep: "Sleep",
    activity: "Activity",
    nutrition: "Nutrition",
    stress: "Stress",
};

export function HealthRadarChart() {
    const { healthVector, computeHealthScore } = useHealthStore();
    const score = computeHealthScore();

    const data = Object.keys(IDEAL_VECTOR).map((key) => ({
        axis: AXIS_LABELS[key],
        You: Math.round(
            (healthVector[key as keyof typeof healthVector] ?? 0) * 100
        ),
        Ideal: 100,
    }));

    const statusColor =
        score >= 80
            ? "#22c55e"
            : score >= 65
                ? "#3b82f6"
                : score >= 50
                    ? "#f59e0b"
                    : "#ef4444";

    const statusLabel =
        score >= 80
            ? "Excellent"
            : score >= 65
                ? "Good"
                : score >= 50
                    ? "Fair"
                    : "Needs Attention";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-lg"
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Health Radar</h3>
                    <p className="text-sm text-muted-foreground">8-Axis Wellness Vector</p>
                </div>
                <div className="text-center">
                    <div
                        className="text-3xl font-bold"
                        style={{ color: statusColor }}
                    >
                        {score}
                    </div>
                    <div
                        className="text-xs font-semibold"
                        style={{ color: statusColor }}
                    >
                        {statusLabel}
                    </div>
                </div>
            </div>

            <div style={{ height: 340 }}>
                <ResponsiveRadar
                    data={data}
                    keys={["You", "Ideal"]}
                    indexBy="axis"
                    maxValue={100}
                    margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
                    curve="linearClosed"
                    borderWidth={2}
                    borderColor={{ from: "color" }}
                    gridLevels={5}
                    gridShape="circular"
                    gridLabelOffset={12}
                    enableDots
                    dotSize={6}
                    dotColor={{ theme: "background" }}
                    dotBorderWidth={2}
                    dotBorderColor={{ from: "color" }}
                    colors={[statusColor, "#64748b"]}
                    fillOpacity={0.25}
                    blendMode="multiply"
                    animate
                    theme={{
                        text: { fontSize: 11, fill: "#94a3b8" },
                        grid: { line: { stroke: "#334155", strokeWidth: 1 } },
                    }}
                    legends={[
                        {
                            anchor: "top-left",
                            direction: "column",
                            translateX: -50,
                            translateY: -40,
                            itemWidth: 80,
                            itemHeight: 20,
                            symbolSize: 12,
                            symbolShape: "circle",
                            itemTextColor: "#94a3b8",
                        },
                    ]}
                />
            </div>

            {/* Axis details */}
            <div className="grid grid-cols-4 gap-2 mt-4">
                {Object.entries(healthVector).map(([key, val]) => {
                    const pct = Math.round(val * 100);
                    const color =
                        pct >= 80
                            ? "text-green-400"
                            : pct >= 60
                                ? "text-blue-400"
                                : pct >= 40
                                    ? "text-yellow-400"
                                    : "text-red-400";
                    return (
                        <div key={key} className="text-center">
                            <div className={`text-xs font-bold ${color}`}>{pct}%</div>
                            <div className="text-xs text-muted-foreground capitalize">
                                {AXIS_LABELS[key]}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3 italic">
                L2 distance scoring — mathematically grounded wellness analysis
            </p>
        </motion.div>
    );
}
