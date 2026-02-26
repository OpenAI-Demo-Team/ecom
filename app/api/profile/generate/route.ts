import { NextRequest, NextResponse } from "next/server";
import { generateProfile, type ProfileInput } from "../../../../src/backend/services/profileGenerator";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "Anonymous";
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const items = Array.isArray(body.items)
    ? (body.items as Array<{ name?: string; price?: string }>).map((i) => ({
        name: String(i.name ?? ""),
        price: String(i.price ?? "0")
      }))
    : [];

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const input: ProfileInput = { prompt, displayName, bio, items };
  const result = await generateProfile(input);

  return NextResponse.json(result);
}
