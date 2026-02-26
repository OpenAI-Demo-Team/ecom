import type { Metadata } from "next";
import Link from "next/link";

const PRINCIPLES = [
  {
    title: "Make dev identity expressive",
    body: "Profiles should feel personal, not templated. We let builders describe their vibe in plain language and turn it into a page they are proud to share.",
  },
  {
    title: "Keep social focused on builders",
    body: "DevSpace is designed for developers connecting with developers. Discovery, posting, and collaboration stay centered around craft and community.",
  },
  {
    title: "Ship practical AI experiences",
    body: "We use AI to remove boring setup work, not to replace your voice. You stay in control while Codex accelerates profile creation and iteration.",
  },
] as const;

export const metadata: Metadata = {
  title: "About Us | DevSpace",
  description: "Learn what DevSpace is building and why.",
};

export default function AboutPage() {
  return (
    <main className="landing-page">
      <section className="landing-section" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
        <p className="kicker">About us</p>
        <h1 className="section-title">DevSpace helps developers build a memorable online presence.</h1>
        <p className="subhead" style={{ maxWidth: 760 }}>
          We are building a social platform where every developer can create a unique profile, share updates, discover other builders, and connect through work and style.
        </p>
        <div className="inline">
          <Link href="/signup" className="btn btn-primary">Create your Space</Link>
          <Link href="/login" className="btn btn-secondary">Sign in</Link>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="grid cols-3">
          {PRINCIPLES.map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-cta-section" style={{ paddingTop: "1rem" }}>
        <h2>What we are building next</h2>
        <p className="landing-cta-desc">
          Better profile customization, richer discovery, and stronger collaboration tools for developer communities.
        </p>
        <Link href="/explore" className="btn btn-primary btn-lg">
          Explore profiles
        </Link>
      </section>
    </main>
  );
}
