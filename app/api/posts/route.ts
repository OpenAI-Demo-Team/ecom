import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/src/backend/auth/session";
import { readStore, updateStore } from "@/src/backend/db/store";
import type { Post } from "@/src/backend/db/store";

export async function GET() {
  const store = await readStore();
  const posts = [...store.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const comments = store.comments;
  return NextResponse.json({ posts, comments });
}

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const content = String(body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;

  const store = await readStore();
  const profile = store.profiles.find(p => p.userId === user.id);

  const post: Post = {
    id: `p-${Date.now()}`,
    userId: user.id,
    username: profile?.username ?? user.id.replace("u-", ""),
    displayName: profile?.displayName ?? user.name,
    avatarUrl: profile?.avatarUrl ?? `https://i.pravatar.cc/150?u=${user.id}`,
    content,
    imageUrl,
    likes: [],
    createdAt: new Date().toISOString(),
  };

  await updateStore((s) => {
    s.posts.push(post);
  });

  return NextResponse.json({ post });
}
