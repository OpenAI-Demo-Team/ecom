import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  createSessionForUser,
  isUsernameTaken,
  SESSION_COOKIE_NAME
} from "../../../../src/backend/auth/session";
import { updateStore, type DevSpaceProfile } from "../../../../src/backend/db/store";
import { generateProfile } from "../../../../src/backend/services/profileGenerator";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const vibePrompt = String(formData.get("vibePrompt") ?? "").trim();
  const githubTokenRaw = String(formData.get("githubToken") ?? "").trim();
  const githubToken = (githubTokenRaw || process.env.DEVSPACE_DEFAULT_GITHUB_TOKEN || "").trim() || undefined;

  if (!email || !password || !name || !username) {
    return NextResponse.redirect(new URL("/signup?error=missing", request.url));
  }

  if (username.length < 2 || username.length > 24) {
    return NextResponse.redirect(new URL("/signup?error=username", request.url));
  }

  if (await isUsernameTaken(username)) {
    return NextResponse.redirect(new URL("/signup?error=taken", request.url));
  }

  const user = await createUser({ email, password, name, username, githubToken });
  const token = await createSessionForUser(user.id);

  const profile = await generateProfile({
    prompt: vibePrompt || "modern developer, clean dark theme, subtle animations",
    displayName: name,
    bio: "",
    items: []
  });

  await updateStore((store) => {
    const now = new Date().toISOString();
    store.profiles.push({
      userId: user.id,
      username,
      displayName: name,
      bio: "",
      avatarUrl: `https://i.pravatar.cc/150?u=${username}@devspace.demo`,
      vibePrompt: vibePrompt || "modern developer, clean dark theme",
      generatedHtml: profile.html,
      generatedCss: profile.css,
      provider: profile.provider,
      items: [],
      friends: [],
      createdAt: now,
      updatedAt: now
    });
  });

  const response = NextResponse.redirect(new URL(`/profile/${username}`, request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24
  });

  return response;
}
