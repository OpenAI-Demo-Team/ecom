"use client";

import { useState, useEffect } from "react";

type Profile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  vibePrompt: string;
  generatedHtml: string;
  generatedCss: string;
  provider: string;
  items: Array<{ id: string; name: string; price: number }>;
  friends: string[];
};

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d) => {
        setProfiles(d.profiles ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <div className="spin" style={{ width: 32, height: 32, border: "3px solid #333", borderTopColor: "#6366f1", borderRadius: "50%", margin: "0 auto 1rem" }} />
        <p style={{ color: "#666" }}>Loading profiles...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="fade-in-up" style={{ textAlign: "center", marginBottom: "2rem" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
          Explore Spaces
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, #a0a0ff 50%, #6366f1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Every Space is unique
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: "36rem", margin: "0.5rem auto 0", fontSize: "0.95rem" }}>
          Each Space below was vibecoded by Codex from a text prompt. Click to enter their world.
        </p>
      </div>

      {/* Grid */}
      <div className="explore-grid fade-in-up">
        {profiles.map((profile) => (
          <a
            key={profile.userId}
            href={`/profile/${profile.username}`}
            className="explore-card"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="explore-preview">
              <div
                style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "200%", height: "200%", pointerEvents: "none" }}
                dangerouslySetInnerHTML={{
                  __html: `<style>${profile.generatedCss}</style>${profile.generatedHtml}`,
                }}
              />
            </div>
            <div className="explore-card-info">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span className="explore-card-name">{profile.displayName}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>@{profile.username}</span>
              </div>
              <p className="explore-card-bio">{profile.bio}</p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <span className="badge badge-success">{profile.friends.length} friend{profile.friends.length !== 1 ? "s" : ""}</span>
                {profile.items.length > 0 && (
                  <span className="badge" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                    {profile.items.length} item{profile.items.length !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                  {profile.vibePrompt.split(",")[0]}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {profiles.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>No profiles yet</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Be the first to create a vibe-coded profile.
          </p>
          <a className="btn btn-primary" href="/signup">Create Your Profile</a>
        </div>
      )}
    </>
  );
}
