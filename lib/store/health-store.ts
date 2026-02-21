import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VitalEntry {
    id: string;
    type: "heart_rate" | "spo2" | "sleep_score" | "steps" | "stress";
    value: number;
    unit: string;
    timestamp: string;
    source: "manual" | "ppg" | "ocr" | "wearable";
}

export interface HealthVector {
    cardiovascular: number; // 0-1
    metabolic: number;
    respiratory: number;
    mental_health: number;
    sleep: number;
    activity: number;
    nutrition: number;
    stress: number;
}

export interface HealthQuest {
    id: string;
    title: string;
    description: string;
    progress: number; // 0-100
    reward: number; // Vita Points
    deadline: string;
    tasks: { name: string; complete: boolean }[];
    category: "vitals" | "activity" | "nutrition" | "mental" | "community";
}

export interface CommunityPin {
    id: string;
    lat: number;
    lng: number;
    type: "safe" | "caution" | "danger";
    category: string;
    description: string;
    timestamp: string;
}

export interface ConsultationReceipt {
    id: string;
    timestamp: string;
    agentType: string;
    promptSummary: string;
    responseHash: string;
    modelVersion: string;
    disclaimer: string;
}

export interface UserProfile {
    age?: number;
    gender?: string;
    weight?: number;
    height?: number;
    conditions: string[];
    medications: string[];
    bloodType?: string;
    emergencyContact?: string;
}

interface SOSState {
    active: boolean;
    countdown: number;
    location?: { lat: number; lng: number };
}

interface HealthStore {
    vitals: VitalEntry[];
    addVital: (vital: Omit<VitalEntry, "id">) => void;
    getVitalsByType: (type: VitalEntry["type"]) => VitalEntry[];
    getRecentVitals: (days: number) => VitalEntry[];

    healthVector: HealthVector;
    updateHealthVector: (vector: Partial<HealthVector>) => void;
    computeHealthScore: () => number;

    quests: HealthQuest[];
    vitaPoints: number;
    level: number;
    streakDays: number;
    completeQuestTask: (questId: string, taskName: string) => void;
    addVitaPoints: (points: number) => void;

    communityPins: CommunityPin[];
    addCommunityPin: (pin: Omit<CommunityPin, "id">) => void;
    removeCommunityPin: (id: string) => void;

    consultationReceipts: ConsultationReceipt[];
    addConsultationReceipt: (receipt: Omit<ConsultationReceipt, "id">) => void;

    userProfile: UserProfile;
    updateUserProfile: (profile: Partial<UserProfile>) => void;

    sosState: SOSState;
    triggerSOS: (location?: { lat: number; lng: number }) => void;
    cancelSOS: () => void;
    decrementSOSCountdown: () => void;
}

// ── Default Quests ────────────────────────────────────────────────────────────

const defaultQuests: HealthQuest[] = [
    {
        id: "q1",
        title: "Vital Tracker",
        description: "Log your vitals for 7 consecutive days",
        progress: 0,
        reward: 500,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
            { name: "Log heart rate today", complete: false },
            { name: "Log SpO2 today", complete: false },
            { name: "Log 3 days in a row", complete: false },
            { name: "Log 7 days in a row", complete: false },
        ],
        category: "vitals",
    },
    {
        id: "q2",
        title: "Community Guardian",
        description: "Report 3 health hazards in your community",
        progress: 0,
        reward: 750,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
            { name: "Report first hazard", complete: false },
            { name: "Report second hazard", complete: false },
            { name: "Report third hazard", complete: false },
        ],
        category: "community",
    },
    {
        id: "q3",
        title: "AI Health Explorer",
        description: "Complete 5 AI Doctor consultations",
        progress: 0,
        reward: 600,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
            { name: "First consultation", complete: false },
            { name: "Upload a lab report", complete: false },
            { name: "Get health score analysis", complete: false },
            { name: "Share health radar chart", complete: false },
            { name: "5 total consultations", complete: false },
        ],
        category: "vitals",
    },
    {
        id: "q4",
        title: "Move & Groove",
        description: "Log 10,000 steps for 5 days this week",
        progress: 0,
        reward: 400,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
            { name: "Log steps Day 1", complete: false },
            { name: "Log steps Day 2", complete: false },
            { name: "Log steps Day 3", complete: false },
            { name: "Log steps Day 4", complete: false },
            { name: "Log steps Day 5", complete: false },
        ],
        category: "activity",
    },
];

const defaultVector: HealthVector = {
    cardiovascular: 0.7,
    metabolic: 0.7,
    respiratory: 0.8,
    mental_health: 0.7,
    sleep: 0.65,
    activity: 0.6,
    nutrition: 0.65,
    stress: 0.7,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useHealthStore = create<HealthStore>()(
    persist(
        (set, get) => ({
            // Vitals
            vitals: [],
            addVital: (vital) =>
                set((s) => ({
                    vitals: [
                        {
                            ...vital,
                            id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                        },
                        ...s.vitals,
                    ].slice(0, 1000),
                })),
            getVitalsByType: (type) => get().vitals.filter((v) => v.type === type),
            getRecentVitals: (days) => {
                const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
                return get().vitals.filter((v) => new Date(v.timestamp).getTime() > cutoff);
            },

            // Health Vector — L2 distance scoring (Protocol Aura Inspiration #14)
            healthVector: defaultVector,
            updateHealthVector: (vector) =>
                set((s) => ({ healthVector: { ...s.healthVector, ...vector } })),
            computeHealthScore: () => {
                const v = get().healthVector;
                const ideal = [1, 1, 1, 1, 1, 1, 1, 1];
                const current = Object.values(v);
                const l2 = Math.sqrt(
                    current.reduce((sum, val, i) => sum + (ideal[i] - val) ** 2, 0)
                );
                const maxL2 = Math.sqrt(8);
                return Math.round((1 - l2 / maxL2) * 100);
            },

            // Quests & Gamification (SustainLabs Inspiration #3)
            quests: defaultQuests,
            vitaPoints: 0,
            level: 1,
            streakDays: 0,
            completeQuestTask: (questId, taskName) =>
                set((s) => ({
                    quests: s.quests.map((q) => {
                        if (q.id !== questId) return q;
                        const tasks = q.tasks.map((t) =>
                            t.name === taskName ? { ...t, complete: true } : t
                        );
                        const completedCount = tasks.filter((t) => t.complete).length;
                        const progress = Math.round((completedCount / tasks.length) * 100);
                        return { ...q, tasks, progress };
                    }),
                })),
            addVitaPoints: (points) =>
                set((s) => {
                    const newPoints = s.vitaPoints + points;
                    const newLevel = Math.floor(newPoints / 1000) + 1;
                    return { vitaPoints: newPoints, level: newLevel };
                }),

            // Community Pins (PathFindHer Inspiration #6)
            communityPins: [],
            addCommunityPin: (pin) =>
                set((s) => ({
                    communityPins: [
                        {
                            ...pin,
                            id: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                        },
                        ...s.communityPins,
                    ],
                })),
            removeCommunityPin: (id) =>
                set((s) => ({
                    communityPins: s.communityPins.filter((p) => p.id !== id),
                })),

            // Consultation Receipts (Protocol Aura Inspiration #16)
            consultationReceipts: [],
            addConsultationReceipt: (receipt) =>
                set((s) => ({
                    consultationReceipts: [
                        { ...receipt, id: `cr_${Date.now()}` },
                        ...s.consultationReceipts,
                    ].slice(0, 100),
                })),

            // User Profile
            userProfile: { conditions: [], medications: [] },
            updateUserProfile: (profile) =>
                set((s) => ({ userProfile: { ...s.userProfile, ...profile } })),

            // SOS State
            sosState: { active: false, countdown: 10 },
            triggerSOS: (location) =>
                set({ sosState: { active: true, countdown: 10, location } }),
            cancelSOS: () => set({ sosState: { active: false, countdown: 10 } }),
            decrementSOSCountdown: () =>
                set((s) => ({
                    sosState: {
                        ...s.sosState,
                        countdown: Math.max(0, s.sosState.countdown - 1),
                    },
                })),
        }),
        {
            name: "carenexa-health-store",
            storage: createJSONStorage(() =>
                typeof window !== "undefined" ? localStorage : ({} as any)
            ),
            partialize: (s) => ({
                vitals: s.vitals,
                healthVector: s.healthVector,
                quests: s.quests,
                vitaPoints: s.vitaPoints,
                level: s.level,
                streakDays: s.streakDays,
                communityPins: s.communityPins,
                consultationReceipts: s.consultationReceipts,
                userProfile: s.userProfile,
            }),
        }
    )
);
