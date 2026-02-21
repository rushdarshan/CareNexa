"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Map, Trophy, FileText, Shield, BarChart2, Zap } from "lucide-react";
import { useHealthStore } from "@/lib/store/health-store";

// Lazy-load all heavy feature components (SustainLabs Inspiration #1)
const HealthRadarChart = dynamic(
  () =>
    import("@/components/health/health-radar-chart").then((m) => ({
      default: m.HealthRadarChart,
    })),
  { ssr: false, loading: () => <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" /> }
);
const HealthQuests = dynamic(
  () =>
    import("@/components/health/health-quests").then((m) => ({
      default: m.HealthQuests,
    })),
  { ssr: false, loading: () => <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" /> }
);
const CommunityHealthMap = dynamic(
  () =>
    import("@/components/health/community-health-map").then((m) => ({
      default: m.CommunityHealthMap,
    })),
  { ssr: false, loading: () => <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" /> }
);
const MedicalOCR = dynamic(
  () =>
    import("@/components/health/medical-ocr").then((m) => ({
      default: m.MedicalOCR,
    })),
  { ssr: false, loading: () => <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" /> }
);
const ConsultationReceipts = dynamic(
  () =>
    import("@/components/health/consultation-receipt").then((m) => ({
      default: m.ConsultationReceipts,
    })),
  { ssr: false, loading: () => <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" /> }
);

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "map", label: "Community Map", icon: Map },
  { id: "quests", label: "Quests", icon: Trophy },
  { id: "reports", label: "Patient Report Analysis", icon: FileText },
  { id: "receipts", label: "Audit Trail", icon: Shield },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { vitaPoints, level, computeHealthScore } = useHealthStore();
  const score = computeHealthScore();

  const statusColor =
    score >= 80
      ? "text-green-400"
      : score >= 65
        ? "text-blue-400"
        : score >= 50
          ? "text-yellow-400"
          : "text-red-400";

  return (
    <div className="min-h-screen bg-background pt-6 pb-20">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Health Dashboard
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-muted-foreground text-sm">
              Level {level}
            </span>
            <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
              <Zap className="w-3.5 h-3.5" />
              {vitaPoints.toLocaleString()} Vita Points
            </span>
            <span className={`text-sm font-semibold ${statusColor}`}>
              Health Score: {score}/100
            </span>
          </div>
        </motion.div>

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HealthRadarChart />
              <div className="space-y-4">
                {/* Health Score Card */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-sm text-muted-foreground mb-2">
                    Overall Health Score
                  </p>
                  <div className="text-5xl font-bold text-foreground">
                    <span className={statusColor}>{score}</span>
                    <span className="text-lg text-muted-foreground">/100</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full mt-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Computed via L2 distance from ideal wellness vector
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Quick Stats
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    {[
                      {
                        label: "Vita Points",
                        value: vitaPoints.toLocaleString(),
                        color: "text-yellow-400",
                        icon: "⚡",
                      },
                      {
                        label: "Level",
                        value: level,
                        color: "text-primary",
                        icon: "🎯",
                      },
                    ].map((s) => (
                      <div key={s.label} className="bg-secondary rounded-xl p-3">
                        <div className="text-xl mb-0.5">{s.icon}</div>
                        <div className={`text-xl font-bold ${s.color}`}>
                          {s.value}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature Quick Links */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Scan Area",
                        icon: Map,
                        tab: "map" as TabId,
                        color: "text-green-400",
                      },
                      {
                        label: "Upload Labs",
                        icon: FileText,
                        tab: "reports" as TabId,
                        color: "text-blue-400",
                      },
                      {
                        label: "View Quests",
                        icon: Trophy,
                        tab: "quests" as TabId,
                        color: "text-yellow-400",
                      },
                      {
                        label: "Audit Trail",
                        icon: Shield,
                        tab: "receipts" as TabId,
                        color: "text-purple-400",
                      },
                    ].map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={() => setActiveTab(action.tab)}
                          className="flex items-center gap-2 p-3 bg-secondary rounded-xl hover:bg-muted transition-colors text-sm font-medium"
                        >
                          <Icon className={`w-4 h-4 ${action.color}`} />
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "map" && <CommunityHealthMap />}
          {activeTab === "quests" && <HealthQuests />}
          {activeTab === "reports" && <MedicalOCR />}
          {activeTab === "receipts" && <ConsultationReceipts />}
        </motion.div>
      </div>
    </div>
  );
}