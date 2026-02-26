"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type Post = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  content: string;
  imageUrl: string | null;
  likes: string[];
  createdAt: string;
};

type Comment = {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
};

type SuggestedUser = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function Avatar({ src, name, size }: { src?: string | null; name: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const s = size ?? 40;
  const initial = (name || "?")[0].toUpperCase();

  if (!src || errored) {
    return (
      <div className="post-avatar-fallback" style={{ width: s, height: s, fontSize: s * 0.4 }}>
        {initial}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="post-avatar"
      style={{ width: s, height: s }}
      onError={() => setErrored(true)}
    />
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PostCard({
  post,
  comments,
  user,
  onLike,
  onComment,
}: {
  post: Post;
  comments: Comment[];
  user: AuthUser;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const liked = post.likes.includes(user.id);
  const postComments = comments.filter((c) => c.postId === post.id);

  const handleComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onComment(post.id, trimmed);
    setCommentText("");
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <Link href={`/profile/${post.username}`}>
          <Avatar src={post.avatarUrl} name={post.displayName} />
        </Link>
        <div className="post-author">
          <Link href={`/profile/${post.username}`} className="post-author-name">
            {post.displayName}
          </Link>
          <Link href={`/profile/${post.username}`} className="post-author-handle">
            @{post.username}
          </Link>
        </div>
        <span className="post-time">{relativeTime(post.createdAt)}</span>
      </div>

      <div className="post-content">{post.content}</div>

      {post.imageUrl && (
        <img src={post.imageUrl} alt="" className="post-image" />
      )}

      <div className="post-actions">
        <button
          className={`post-action-btn${liked ? " liked" : ""}`}
          onClick={() => onLike(post.id)}
        >
          <HeartIcon filled={liked} />
          <span>{post.likes.length}</span>
        </button>
        <button
          className="post-action-btn"
          onClick={() => setShowComments(!showComments)}
        >
          <CommentIcon />
          <span>{postComments.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="comment-section">
          {postComments.map((c) => (
            <div key={c.id} className="comment-item">
              <Link href={`/profile/${c.username}`} className="comment-author">
                {c.displayName}
              </Link>
              <span className="comment-text">{c.content}</span>
              <span className="comment-time">{relativeTime(c.createdAt)}</span>
            </div>
          ))}
          <div className="comment-input">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
            />
            <button className="btn btn-primary btn-sm" onClick={handleComment}>
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data.posts ?? []);
      setComments(data.comments ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
          return;
        }
        setUser(data.user);
        setLoading(false);
        fetchPosts();
        fetch("/api/friends/suggested")
          .then((r) => r.json())
          .then((d) => setSuggested(d.suggested ?? []))
          .catch(() => {});
      })
      .catch(() => router.push("/login"));

    refreshTimer.current = setInterval(fetchPosts, 30000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [router, fetchPosts]);

  const handlePost = async () => {
    const content = newContent.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          imageUrl: newImageUrl.trim() || null,
        }),
      });
      if (res.ok) {
        setNewContent("");
        setNewImageUrl("");
        await fetchPosts();
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: data.likes } : p))
      );
    }
  };

  const handleComment = async (postId: string, content: string) => {
    const res = await fetch(`/api/posts/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="feed-layout">
      <div className="feed-main">
        <div className="post-composer">
          <div className="post-composer-header">
            <Avatar src={user.avatarUrl} name={user.displayName} />
            <textarea
              placeholder="What's on your mind?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </div>
          <div className="post-composer-actions">
            <input
              type="text"
              className="post-composer-image-input"
              placeholder="Image URL (optional)"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={handlePost}
              disabled={!newContent.trim() || posting}
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            comments={comments}
            user={user}
            onLike={handleLike}
            onComment={handleComment}
          />
        ))}
      </div>

      <aside className="suggested-sidebar">
        <div className="suggested-card">
          <h3>Suggested Friends</h3>
          {suggested.length === 0 && (
            <p className="suggested-empty">No suggestions right now</p>
          )}
          {suggested.map((s) => (
            <div key={s.userId} className="suggested-item">
              <Link href={`/profile/${s.username}`}>
                <Avatar src={s.avatarUrl} name={s.displayName} size={36} />
              </Link>
              <div className="suggested-item-info">
                <Link href={`/profile/${s.username}`} className="suggested-item-name">
                  {s.displayName}
                </Link>
                <div className="suggested-item-handle">@{s.username}</div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  await fetch("/api/friends", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ friendId: s.userId }),
                  });
                  setSuggested((prev) => prev.filter((x) => x.userId !== s.userId));
                }}
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
