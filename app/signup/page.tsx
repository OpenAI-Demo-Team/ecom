"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VIBE_PRESETS = [
  { label: "Cyberpunk", prompt: "cyberpunk hacker, neon green, CRT scanlines, glitch effects" },
  { label: "Minimalist", prompt: "minimal pink, soft gradients, elegant serif typography" },
  { label: "Retro", prompt: "vaporwave retro, chrome text, sunset grid, synthwave colors" },
  { label: "Cosmic", prompt: "cosmic space, galaxy gradient, floating particles, nebula glow" },
  { label: "Brutalist", prompt: "brutalist raw, black & white, thick borders, monospace, all caps" },
  { label: "Pastel", prompt: "pastel dreamy, soft colors, rounded shapes, gentle animations" },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vibePrompt, setVibePrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData();
    form.set("name", name);
    form.set("username", username.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
    form.set("email", email);
    form.set("password", password);
    form.set("vibePrompt", vibePrompt);
    // Hidden for now; server can prefill from DEVSPACE_DEFAULT_GITHUB_TOKEN.
    form.set("githubToken", "");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: form,
        redirect: "follow",
      });

      if (res.redirected) {
        const url = new URL(res.url);
        if (url.searchParams.get("error")) {
          const errCode = url.searchParams.get("error");
          if (errCode === "taken") setError("Username already taken.");
          else if (errCode === "username") setError("Username must be 2-24 characters.");
          else setError("Missing required fields.");
          setLoading(false);
          return;
        }
        router.push(url.pathname);
        return;
      }

      router.push("/feed");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const selectPreset = (preset: typeof VIBE_PRESETS[number]) => {
    setVibePrompt(preset.prompt);
    setSelectedPreset(preset.label);
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <span className="brand-mark">DS</span>
          <h1>Create your Space</h1>
          <p className="subtitle">Describe your vibe. Codex will vibecode your unique dev Space — your personal repo of identity.</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <span>&#9888;&#65039;</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="name">Display name</label>
            <input
              id="name"
              type="text"
              placeholder="Jane Developer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="jane"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, numbers, hyphens, underscores"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="vibe">Vibecode prompt</label>
            <textarea
              id="vibe"
              placeholder="e.g. cyberpunk hacker, neon green on black, CRT scanlines, glitch effects..."
              rows={3}
              value={vibePrompt}
              onChange={(e) => {
                setVibePrompt(e.target.value);
                setSelectedPreset(null);
              }}
            />
          </div>

          <div className="vibe-chips">
            {VIBE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`vibe-chip${selectedPreset === preset.label ? " active" : ""}`}
                onClick={() => selectPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
