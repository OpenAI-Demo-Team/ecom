import { NextResponse } from "next/server";
import { readStore } from "@/src/backend/db/store";

export async function GET(
  _req: Request,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const store = await readStore();
  const profile = store.profiles.find((p) => p.username === username);

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const posts = store.posts.filter((p) => p.userId === profile.userId);
  const comments = store.comments.filter((c) =>
    posts.some((p) => p.id === c.postId)
  );
  const friends = store.profiles
    .filter((p) => profile.friends.includes(p.userId))
    .map((f) => ({
      username: f.username,
      displayName: f.displayName,
      avatarUrl: f.avatarUrl,
      bio: f.bio,
    }));

  return NextResponse.json({ profile, posts, comments, friends });
}
