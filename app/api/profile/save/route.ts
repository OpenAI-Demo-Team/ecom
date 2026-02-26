import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "../../../../src/backend/auth/session";
import { updateStore } from "../../../../src/backend/db/store";
import { generateProfile } from "../../../../src/backend/services/profileGenerator";

const MAX_ITEMS = 24;

function cleanText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanPrice(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token ?? null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const vibePrompt = cleanText(body.vibePrompt, 1200);
  const displayName = cleanText(body.displayName, 80) || user.name;
  const bio = cleanText(body.bio, 240);
  const venmoUsername = typeof body.venmoUsername === "string" ? cleanText(body.venmoUsername, 40) : undefined;
  const cashAppUsername = typeof body.cashAppUsername === "string" ? cleanText(body.cashAppUsername, 40) : undefined;
  const items = Array.isArray(body.items)
    ? (body.items as Array<{ id?: string; name?: string; price?: number; description?: string; imageUrl?: string }>)
        .slice(0, MAX_ITEMS)
        .map((i, idx) => ({
        id: String(i.id ?? `item-${user.id}-${idx}`),
        name: cleanText(i.name, 80),
        price: cleanPrice(i.price),
        description: cleanText(i.description, 240),
        imageUrl: cleanText(i.imageUrl, 500),
      }))
    : [];

  let html: string | undefined;
  let css: string | undefined;
  let layout: { tabOrder?: string[] } | undefined;
  let provider: "codex" | "fallback" | undefined;
  let providerReason: string | undefined;
  let profileFound = false;

  if (vibePrompt) {
    const result = await generateProfile({
      prompt: vibePrompt,
      displayName,
      bio,
      items: items.map((i) => ({ name: i.name, price: String(i.price) }))
    });
    html = result.html;
    css = result.css;
    layout = result.layout;
    provider = result.provider;
    providerReason = result.providerReason;
  }

  await updateStore((store) => {
    const profile = store.profiles.find((p) => p.userId === user.id);
    if (!profile) return;
    profileFound = true;
    profile.displayName = displayName;
    profile.bio = bio;
    profile.items = items;
    if (venmoUsername !== undefined) profile.venmoUsername = venmoUsername || undefined;
    if (cashAppUsername !== undefined) profile.cashAppUsername = cashAppUsername || undefined;
    if (html && css) {
      profile.vibePrompt = vibePrompt;
      profile.generatedHtml = html;
      profile.generatedCss = css;
      profile.layout = layout;
      profile.provider = provider ?? "fallback";
    }
    profile.updatedAt = new Date().toISOString();
  });

  if (!profileFound) {
    return NextResponse.json({ error: "No profile found for user" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    ...(html && css ? { html, css, provider, providerReason } : {})
  });
}
