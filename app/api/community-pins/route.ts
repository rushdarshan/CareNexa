import { NextRequest, NextResponse } from "next/server";

// In-memory store (replace with Firebase/PostgreSQL in production)
interface HealthPin {
    id: string;
    lat: number;
    lng: number;
    type: "safe" | "caution" | "danger";
    category: "outbreak" | "pollution" | "water" | "clinic" | "pharmacy" | "general";
    description: string;
    timestamp: string;
    upvotes: number;
}

const pins: HealthPin[] = []; // Replace with DB in production

export async function GET() {
    return NextResponse.json({ pins, count: pins.length });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lat, lng, type, category, description } = body;

        if (!lat || !lng || !type || !description) {
            return NextResponse.json({ error: "lat, lng, type, and description are required" }, { status: 400 });
        }

        if (!["safe", "caution", "danger"].includes(type)) {
            return NextResponse.json({ error: "type must be safe, caution, or danger" }, { status: 400 });
        }

        const pin: HealthPin = {
            id: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            lat: Number(lat),
            lng: Number(lng),
            type,
            category: category || "general",
            description: String(description).slice(0, 500),
            timestamp: new Date().toISOString(),
            upvotes: 0,
        };

        pins.push(pin);

        console.log("[AUDIT/PIN_CREATED]", JSON.stringify({
            id: pin.id,
            type: pin.type,
            timestamp: pin.timestamp,
        }));

        return NextResponse.json({ pin }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create pin" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Pin ID required" }, { status: 400 });

        const idx = pins.findIndex((p) => p.id === id);
        if (idx === -1) return NextResponse.json({ error: "Pin not found" }, { status: 404 });

        pins.splice(idx, 1);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete pin" }, { status: 500 });
    }
}
