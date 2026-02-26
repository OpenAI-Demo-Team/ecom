import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/src/backend/auth/session";
import { readStore } from "@/src/backend/db/store";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);
  if (!user) return NextResponse.json({ suggested: [] });

  const store = await readStore();
  const myProfile = store.profiles.find(p => p.userId === user.id);
  const myFriends = myProfile?.friends ?? [];

  const suggested = store.profiles
    .filter(p => p.userId !== user.id && !myFriends.includes(p.userId))
    .slice(0, 5)
    .map(p => ({
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
    }));

  return NextResponse.json({ suggested });
}
