"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PREVIEW_PROFILES = [
  { name: "Jack Chen", vibe: "Cyberpunk Hacker", gradient: "linear-gradient(135deg, #000, #003300)", color: "#00ff41", username: "jack" },
  { name: "Mira Patel", vibe: "Minimalist Pink", gradient: "linear-gradient(135deg, #ffe4ec, #fff0f5)", color: "#8b3a6b", username: "mira" },
  { name: "Zeph Torres", vibe: "Vaporwave Retro", gradient: "linear-gradient(135deg, #ff71ce, #7b2ff7)", color: "#fff", username: "zeph" },
  { name: "Nova Osei", vibe: "Cosmic Space", gradient: "linear-gradient(135deg, #0b0015, #1a0030)", color: "#c7a0ff", username: "nova" },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          router.push("/feed");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) return null;

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-badge">Developer Social Platform</div>
        <h1 className="landing-title">
          Vibecode your<br />Space
        </h1>
        <p className="landing-subtitle">
          Your Space is your dev identity — a unique, Codex-generated page. Describe your vibe in plain text. Watch it become your personal repo of style.
        </p>
        <div className="landing-ctas">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Sign Up Free
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Log In
          </Link>
        </div>
      </section>

      <section className="landing-profiles">
        {PREVIEW_PROFILES.map((p) => (
          <div key={p.username} className="landing-profile-card" style={{ background: p.gradient }}>
            <div className="landing-profile-overlay">
              <h3 style={{ color: p.color }}>{p.name}</h3>
              <span className="landing-profile-vibe">{p.vibe}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="landing-section">
        <h2>How it works</h2>
        <div className="how-it-works">
          <div className="how-step">
            <div className="how-step-number">1</div>
            <h3>Sign up &amp; describe your vibe</h3>
            <p>Tell us your aesthetic in plain English — &quot;cyberpunk hacker, neon green, CRT scanlines&quot;</p>
          </div>
          <div className="how-step">
            <div className="how-step-number">2</div>
            <h3>Codex generates your page</h3>
            <p>Our AI creates custom HTML &amp; CSS with animations, gradients, and unique effects</p>
          </div>
          <div className="how-step">
            <div className="how-step-number">3</div>
            <h3>Share &amp; connect</h3>
            <p>Your profile goes live. Post updates, connect with other devs, and build your network</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-cta-section">
        <h2>Ready to stand out?</h2>
        <p className="landing-cta-desc">
          Join DevSpace and let Codex AI craft a profile that&apos;s uniquely you.
        </p>
        <Link href="/signup" className="btn btn-primary btn-lg">
          Get Started
        </Link>
      </section>
    </div>
  );
}
