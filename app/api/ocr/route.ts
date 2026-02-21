import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export interface ExtractedLabResult {
    testName: string;
    value: number | string;
    unit: string;
    referenceRange: string;
    status: "normal" | "low" | "high" | "critical";
    confidence: number; // 0–1
}

export interface OCRResponse {
    extractedMetrics: ExtractedLabResult[];
    originalText: string;
    reportDate: string;
    labName: string;
    patientAge?: string;
    recommendedAction: string;
    auditHash: string; // SHA-256 of extracted content
    timestamp: string;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Unsupported file type. Use JPEG, PNG, WebP or PDF." }, { status: 400 });
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const mimeType = file.type as string; // application/pdf is natively supported by Gemini 1.5+ Flash

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        const prompt = `You are a medical document analyst. Extract all lab results from this medical report image.

Return ONLY this exact JSON structure (no markdown):
{
  "extractedMetrics": [
    {
      "testName": "Hemoglobin",
      "value": 14.5,
      "unit": "g/dL",
      "referenceRange": "12.0-16.0",
      "status": "normal",
      "confidence": 0.95
    }
  ],
  "originalText": "raw text extracted from document",
  "reportDate": "YYYY-MM-DD or unknown",
  "labName": "lab name or unknown",
  "patientAge": "age or unknown",
  "recommendedAction": "brief recommendation"
}

Extract ALL visible test results. Status: normal/low/high/critical based on reference ranges.
Confidence is how sure you are about the extraction (0.0-1.0).`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64, mimeType } },
        ]);

        const raw = result.response.text().trim();
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);

        // Generate SHA-256 audit hash
        const auditContent = JSON.stringify({
            metrics: parsed.extractedMetrics,
            originalText: parsed.originalText,
        });
        const auditHash = createHash("sha256").update(auditContent).digest("hex");

        const response: OCRResponse = {
            ...parsed,
            auditHash,
            timestamp: new Date().toISOString(),
        };

        console.log("[AUDIT/OCR]", JSON.stringify({
            auditHash,
            timestamp: response.timestamp,
            metricsCount: parsed.extractedMetrics?.length,
        }));

        return NextResponse.json(response);
    } catch (error) {
        console.error("[API/OCR ERROR]", error);
        return NextResponse.json({ error: "Failed to process document. Please try again." }, { status: 500 });
    }
}
