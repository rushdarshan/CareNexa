import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Rate limiting map (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

function getServerGeminiKey(): string | null {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY ||
    "";

  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const ipKey = getRateLimitKey(req);
    if (!checkRateLimit(ipKey)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
    }

    const { prompt, systemContext, agentType = "general" } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }

    if (prompt.length > 4000) {
      return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
    }

    // Agent-based system prompts (MED_PROTOCOL)
    const agentPrompts: Record<string, string> = {
      general: `You are Dr. Echo, CareNexa's general health advisor. You provide helpful, evidence-based health information.
IMPORTANT: Always remind users that you are NOT a substitute for professional medical advice.`,
      nutrition: `You are CareNexa's Nutrition Agent. You specialize in dietary advice, nutritional analysis, and meal planning.
Focus on evidence-based nutritional guidance. Always recommend consulting a registered dietitian for medical nutrition therapy.`,
      fitness: `You are CareNexa's Fitness Agent. You specialize in exercise science, workout planning, and physical rehabilitation.
Provide safe, progressive exercise recommendations. Always recommend consulting a physiotherapist for injury-related concerns.`,
      mental_health: `You are CareNexa's Mental Health Agent. You provide supportive, compassionate guidance on mental wellness.
CRITICAL: Always recommend professional mental health support for serious concerns. If user expresses suicidal ideation, immediately provide crisis hotline: 988 (US).`,
      triage: `You are CareNexa's Triage Agent. Analyze the user query and classify it into one of: nutrition, fitness, mental_health, emergency, general.
Respond ONLY with JSON: { "agentType": "...", "urgency": "low|medium|high|emergency", "reasoning": "..." }`,
      emergency: `You are CareNexa's Emergency Triage Agent. The user may be experiencing a medical emergency.
IMMEDIATELY advise calling emergency services (911/112/999). Provide basic first-aid guidance while help is on the way.`,
    };

    const systemPrompt = agentPrompts[agentType] || agentPrompts.general;
    const fullPrompt = systemContext
      ? `${systemPrompt}\n\nUSER HEALTH CONTEXT:\n${systemContext}\n\nUSER QUERY: ${prompt}`
      : `${systemPrompt}\n\nUSER QUERY: ${prompt}`;

    // Try all supported key names used in this codebase
    const apiKey = getServerGeminiKey();
    if (!apiKey) {
      return NextResponse.json({
        error: "API key not configured",
        expected: ["GEMINI_API_KEY", "NEXT_PUBLIC_GEMINI_API_KEY", "NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY"],
      }, { status: 500 });
    }

    const ai = new GoogleGenerativeAI(apiKey);

    const modelCandidates = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro",
    ];

    let response = "";
    let selectedModel = "";
    let lastModelError: unknown = null;

    for (const modelName of modelCandidates) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        response = result.response.text();
        selectedModel = modelName;
        if (response && response.trim().length > 0) {
          break;
        }
      } catch (modelError) {
        lastModelError = modelError;
      }
    }

    if (!response || response.trim().length === 0) {
      console.error("[API/CHAT MODEL ERROR]", {
        message: "All candidate models failed or returned empty output",
        modelCandidates,
        lastModelError,
      });
      return NextResponse.json(
        { error: "AI model unavailable", fallback: true },
        { status: 503 }
      );
    }

    // Audit log
    const auditEntry = {
      timestamp: new Date().toISOString(),
      agentType,
      model: selectedModel,
      promptLength: prompt.length,
      hasContext: !!systemContext,
      responseLength: response.length,
    };
    console.log("[AUDIT]", JSON.stringify(auditEntry));

    return NextResponse.json({ response, agentType, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[API/CHAT ERROR]", error);
    return NextResponse.json(
      { error: "Service temporarily unavailable", fallback: true },
      { status: 503 }
    );
  }
}
