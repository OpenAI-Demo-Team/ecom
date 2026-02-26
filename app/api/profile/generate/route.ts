import { NextRequest, NextResponse } from "next/server";
import { generateProfile, type ProfileInput } from "../../../../src/backend/services/profileGenerator";

const MAX_ITEMS = 24;

function cleanText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanPrice(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  const rounded = Math.max(0, Math.round(parsed * 100) / 100);
  return String(rounded);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = cleanText(body.prompt, 1200);
  const displayName = cleanText(body.displayName, 80) || "Anonymous";
  const bio = cleanText(body.bio, 240);
  const items = Array.isArray(body.items)
    ? (body.items as Array<{ name?: string; price?: string }>)
        .slice(0, MAX_ITEMS)
        .map((i) => ({
        name: cleanText(i.name, 80),
        price: cleanPrice(i.price),
      }))
    : [];

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const input: ProfileInput = { prompt, displayName, bio, items };
  const result = await generateProfile(input);

  return NextResponse.json(result);
}
