"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    AlertTriangle,
    XCircle,
    Loader2,
    Download,
    Shield,
    CheckCircle,
} from "lucide-react";
import { useHealthStore } from "@/lib/store/health-store";
import type { OCRResponse, ExtractedLabResult } from "@/app/api/ocr/route";

const STATUS_STYLES: Record<string, string> = {
    normal: "text-green-400 bg-green-400/10 border-green-400/30",
    low: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    high: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    critical: "text-red-400 bg-red-400/10 border-red-400/30",
};

export function MedicalOCR() {
    const {
        addVital,
        addVitaPoints,
        completeQuestTask,
        addConsultationReceipt,
    } = useHealthStore();
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OCRResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savedMetrics, setSavedMetrics] = useState<Set<string>>(new Set());
    const fileRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/ocr", { method: "POST", body: formData });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "OCR failed");
            }
            const data: OCRResponse = await res.json();
            setResult(data);

            // Add audit receipt
            addConsultationReceipt({
                timestamp: data.timestamp,
                agentType: "ocr",
                promptSummary: `Medical report OCR: ${data.labName || "Unknown Lab"}`,
                responseHash: data.auditHash,
                modelVersion: "gemini-1.5-flash",
                disclaimer:
                    "AI extraction — verify with your healthcare provider before acting on results.",
            });

            addVitaPoints(150);
            completeQuestTask("q3", "Upload a lab report");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to process file"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const saveToDashboard = (metric: ExtractedLabResult) => {
        const typeMap: Record<string, "heart_rate" | "spo2"> = {
            "heart rate": "heart_rate",
            spo2: "spo2",
            oxygen: "spo2",
        };
        const type = Object.entries(typeMap).find(([k]) =>
            metric.testName.toLowerCase().includes(k)
        )?.[1];

        if (type && typeof metric.value === "number") {
            addVital({
                type,
                value: metric.value,
                unit: metric.unit,
                timestamp: new Date().toISOString(),
                source: "ocr",
            });
        }
        setSavedMetrics((s) => new Set([...s, metric.testName]));
    };

    const downloadReceipt = () => {
        if (!result) return;
        const content = {
            auditHash: result.auditHash,
            timestamp: result.timestamp,
            labName: result.labName,
            reportDate: result.reportDate,
            extractedMetrics: result.extractedMetrics,
            disclaimer:
                "This report was extracted by AI. Always verify with a licensed medical professional.",
        };
        const blob = new Blob([JSON.stringify(content, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `carenexa-lab-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Medical Report Analyzer</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
                Upload your lab report (PDF or image) and AI will extract your results
                automatically. +150 VP for uploading.
            </p>

            {/* Upload area */}
            {!result && !loading && (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }`}
                >
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold text-foreground">
                        Drop your lab report here
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Supports JPG, PNG, WebP, PDF · Max 10MB
                    </p>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) =>
                            e.target.files?.[0] && processFile(e.target.files[0])
                        }
                    />
                </div>
            )}

            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12"
                    >
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                        <p className="font-semibold text-foreground">Analyzing with AI...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Extracting lab values from your report
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl mt-4">
                    <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-destructive text-sm">
                            Processing Failed
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Report meta */}
                        <div className="bg-secondary rounded-xl p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-foreground">
                                        {result.labName || "Medical Report"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {result.reportDate !== "unknown"
                                            ? `Date: ${result.reportDate}`
                                            : "Date unknown"}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={downloadReceipt}
                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        <Download className="w-3 h-3" /> Receipt
                                    </button>
                                    <button
                                        onClick={() => {
                                            setResult(null);
                                            setSavedMetrics(new Set());
                                        }}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Audit hash */}
                        <div className="flex items-center gap-2 p-3 bg-green-400/5 border border-green-400/20 rounded-xl">
                            <Shield className="w-4 h-4 text-green-400 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-green-400">
                                    Audit Hash Generated
                                </p>
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                    {result.auditHash}
                                </p>
                            </div>
                        </div>

                        {/* Extracted metrics */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">
                                Extracted Results ({result.extractedMetrics?.length || 0})
                            </h4>
                            {result.extractedMetrics?.map((metric) => (
                                <div
                                    key={metric.testName}
                                    className={`border rounded-xl p-3 ${STATUS_STYLES[metric.status] || STATUS_STYLES.normal
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">
                                                    {metric.testName}
                                                </span>
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[metric.status]
                                                        }`}
                                                >
                                                    {metric.status}
                                                </span>
                                            </div>
                                            <p className="text-lg font-bold mt-1">
                                                {metric.value}{" "}
                                                <span className="text-sm font-normal opacity-70">
                                                    {metric.unit}
                                                </span>
                                            </p>
                                            <p className="text-xs opacity-60">
                                                Ref: {metric.referenceRange} · Confidence:{" "}
                                                {Math.round(metric.confidence * 100)}%
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => saveToDashboard(metric)}
                                            disabled={savedMetrics.has(metric.testName)}
                                            className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${savedMetrics.has(metric.testName)
                                                ? "bg-green-400/20 text-green-400"
                                                : "bg-primary/20 text-primary hover:bg-primary/30"
                                                }`}
                                        >
                                            {savedMetrics.has(metric.testName) ? (
                                                <>
                                                    <CheckCircle className="w-3 h-3" /> Saved
                                                </>
                                            ) : (
                                                "Save"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recommended action */}
                        <div className="flex items-start gap-3 p-4 bg-secondary rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    AI Recommendation
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {result.recommendedAction}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-2 italic">
                                    ⚠ AI-extracted data. Always verify with a licensed healthcare
                                    professional.
                                </p>
                            </div>
                        </div>

                        {/* Upload another */}
                        <button
                            onClick={() => {
                                setResult(null);
                                setSavedMetrics(new Set());
                                setTimeout(() => fileRef.current?.click(), 100);
                            }}
                            className="w-full py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary transition-colors"
                        >
                            Upload Another Report
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
