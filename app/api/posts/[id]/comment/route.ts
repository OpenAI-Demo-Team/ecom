import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/src/backend/auth/session";
import { readStore, updateStore } from "@/src/backend/db/store";
import type { Comment } from "@/src/backend/db/store";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const content = String(body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const store = await readStore();
  const profile = store.profiles.find(p => p.userId === user.id);

  const comment: Comment = {
    id: `c-${Date.now()}`,
    postId: params.id,
    userId: user.id,
    username: profile?.username ?? user.id.replace("u-", ""),
    displayName: profile?.displayName ?? user.name,
    content,
    createdAt: new Date().toISOString(),
  };

  await updateStore((s) => {
    s.comments.push(comment);
  });

  return NextResponse.json({ comment });
}
