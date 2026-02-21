"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Download,
    ChevronDown,
    Clock,
    Bot,
    Copy,
    Check,
} from "lucide-react";
import { useHealthStore, type ConsultationReceipt } from "@/lib/store/health-store";

export function ConsultationReceipts() {
    const { consultationReceipts } = useHealthStore();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const copyHash = async (hash: string, id: string) => {
        await navigator.clipboard.writeText(hash);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const downloadReceipt = (receipt: ConsultationReceipt) => {
        const content = {
            receiptId: receipt.id,
            timestamp: receipt.timestamp,
            agentType: receipt.agentType,
            promptSummary: receipt.promptSummary,
            responseHash: receipt.responseHash,
            modelVersion: receipt.modelVersion,
            disclaimer: receipt.disclaimer,
            generatedBy: "CareNexa",
        };
        const blob = new Blob([JSON.stringify(content, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `consultation-receipt-${receipt.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (consultationReceipts.length === 0) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm font-semibold text-foreground">
                    No Consultation Receipts Yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Every AI consultation and lab report upload generates a cryptographic
                    receipt for your records.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                    <h3 className="font-bold text-foreground">Consultation Receipts</h3>
                    <p className="text-xs text-muted-foreground">
                        SHA-256 signed audit trail · {consultationReceipts.length} records
                    </p>
                </div>
            </div>

            <div className="divide-y divide-border">
                {consultationReceipts.slice(0, 10).map((receipt) => (
                    <div key={receipt.id}>
                        <button
                            className="w-full p-4 text-left hover:bg-secondary/50 transition-colors"
                            onClick={() =>
                                setExpanded(expanded === receipt.id ? null : receipt.id)
                            }
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                        <Bot className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground capitalize">
                                            {receipt.agentType} Consultation
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                            {receipt.promptSummary}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {new Date(receipt.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform mt-1 ${expanded === receipt.id ? "rotate-180" : ""
                                        }`}
                                />
                            </div>
                        </button>

                        <AnimatePresence>
                            {expanded === receipt.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                                        {/* Hash */}
                                        <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> SHA-256 Hash
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        copyHash(receipt.responseHash, receipt.id)
                                                    }
                                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {copied === receipt.id ? (
                                                        <Check className="w-3 h-3" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                    {copied === receipt.id ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                            <p className="text-xs font-mono text-muted-foreground break-all">
                                                {receipt.responseHash}
                                            </p>
                                        </div>

                                        {/* Details */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-secondary rounded-lg p-2">
                                                <p className="text-muted-foreground">Model</p>
                                                <p className="font-semibold text-foreground mt-0.5">
                                                    {receipt.modelVersion}
                                                </p>
                                            </div>
                                            <div className="bg-secondary rounded-lg p-2">
                                                <p className="text-muted-foreground">Receipt ID</p>
                                                <p className="font-semibold text-foreground mt-0.5 truncate">
                                                    {receipt.id}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground italic">
                                            {receipt.disclaimer}
                                        </p>

                                        <button
                                            onClick={() => downloadReceipt(receipt)}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary text-xs font-semibold rounded-xl hover:bg-primary/20 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Download Full Receipt
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}
