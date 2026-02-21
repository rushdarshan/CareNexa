"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy,
    Star,
    Zap,
    CheckCircle,
    Clock,
    Award,
    ChevronDown,
} from "lucide-react";
import { useHealthStore } from "@/lib/store/health-store";

const CATEGORY_COLORS: Record<string, string> = {
    vitals: "text-red-400 bg-red-400/10",
    activity: "text-green-400 bg-green-400/10",
    nutrition: "text-yellow-400 bg-yellow-400/10",
    mental: "text-purple-400 bg-purple-400/10",
    community: "text-blue-400 bg-blue-400/10",
};

export function HealthQuests() {
    const { quests, vitaPoints, level, completeQuestTask, addVitaPoints } =
        useHealthStore();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [justCompleted, setJustCompleted] = useState<string | null>(null);

    const currentLevelPoints = vitaPoints % 1000;
    const levelProgress = (currentLevelPoints / 1000) * 100;

    const handleTaskComplete = (
        questId: string,
        taskName: string,
        questReward: number
    ) => {
        completeQuestTask(questId, taskName);
        const quest = quests.find((q) => q.id === questId);
        if (!quest) return;
        const willBeAllComplete = quest.tasks.every(
            (t) => t.complete || t.name === taskName
        );
        if (willBeAllComplete) {
            addVitaPoints(questReward);
            setJustCompleted(questId);
            // Trigger confetti if available
            import("canvas-confetti").then(({ default: confetti }) => {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            });
            setTimeout(() => setJustCompleted(null), 3000);
        } else {
            addVitaPoints(Math.floor(questReward / quest.tasks.length));
        }
    };

    return (
        <div className="space-y-4">
            {/* Header & Level */}
            <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Trophy className="text-yellow-400 w-6 h-6" />
                        <h3 className="text-lg font-bold">Health Quests</h3>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Zap className="w-4 h-4" />
                        <span>{vitaPoints.toLocaleString()} VP</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Level {level}</span>
                        <span className="text-muted-foreground">
                            {currentLevelPoints}/1000 VP to Level {level + 1}
                        </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${levelProgress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </div>

            {/* Quest Cards */}
            {quests.map((quest) => (
                <motion.div
                    key={quest.id}
                    layout
                    className={`border rounded-2xl overflow-hidden transition-colors ${justCompleted === quest.id
                            ? "border-yellow-400 bg-yellow-400/5"
                            : "border-border bg-card"
                        }`}
                >
                    <button
                        className="w-full p-4 text-left"
                        onClick={() =>
                            setExpandedId(expandedId === quest.id ? null : quest.id)
                        }
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[quest.category] ||
                                            "text-gray-400 bg-gray-400/10"
                                            }`}
                                    >
                                        {quest.category}
                                    </span>
                                    {quest.progress === 100 && (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    )}
                                </div>
                                <h4 className="font-semibold text-foreground">{quest.title}</h4>
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                    {quest.description}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                                    <Star className="w-3 h-3" />
                                    {quest.reward} VP
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                                    <Clock className="w-3 h-3" />
                                    {Math.max(
                                        0,
                                        Math.ceil(
                                            (new Date(quest.deadline).getTime() - Date.now()) /
                                            (1000 * 60 * 60 * 24)
                                        )
                                    )}
                                    d left
                                </div>
                                <ChevronDown
                                    className={`w-3 h-3 text-muted-foreground mt-1 ml-auto transition-transform ${expandedId === quest.id ? "rotate-180" : ""
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>
                                    {quest.tasks.filter((t) => t.complete).length}/
                                    {quest.tasks.length} tasks
                                </span>
                                <span>{quest.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                                    animate={{ width: `${quest.progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>
                    </button>

                    <AnimatePresence>
                        {expandedId === quest.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-border px-4 pb-4 pt-3 space-y-2 overflow-hidden"
                            >
                                {quest.tasks.map((task) => (
                                    <div key={task.name} className="flex items-center gap-3">
                                        <button
                                            onClick={() =>
                                                !task.complete &&
                                                handleTaskComplete(quest.id, task.name, quest.reward)
                                            }
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.complete
                                                    ? "bg-green-400 border-green-400"
                                                    : "border-muted-foreground hover:border-primary"
                                                }`}
                                        >
                                            {task.complete && (
                                                <CheckCircle className="w-3 h-3 text-white fill-white" />
                                            )}
                                        </button>
                                        <span
                                            className={`text-sm ${task.complete
                                                    ? "line-through text-muted-foreground"
                                                    : "text-foreground"
                                                }`}
                                        >
                                            {task.name}
                                        </span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}

            {/* Leaderboard teaser */}
            <div className="border border-border rounded-2xl p-4 bg-card">
                <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Community Leaderboard</h4>
                </div>
                {[
                    { rank: "🏆", name: "HealthHero_42", points: 12450 },
                    { rank: "🥈", name: "WellnessWarrior", points: 9820 },
                    { rank: "🥉", name: "VitaChampion", points: 8600 },
                    { rank: "⭐", name: "You", points: vitaPoints },
                ].map((entry) => (
                    <div
                        key={entry.name}
                        className={`flex items-center justify-between py-2 ${entry.name === "You"
                                ? "text-primary font-semibold"
                                : "text-muted-foreground"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-6 text-sm">{entry.rank}</span>
                            <span className="text-sm">{entry.name}</span>
                        </div>
                        <span className="text-sm font-mono">
                            {entry.points.toLocaleString()} VP
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
