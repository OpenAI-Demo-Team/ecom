"use client";

import { useState, useRef } from "react";

const DEFAULT_ITEMS = [
  { name: "AutoReply Bot", price: "29" },
  { name: "Data Pipeline Agent", price: "49" },
  { name: "Code Review Agent", price: "39" }
];

const SAMPLE_PROMPTS = [
  "dark cyberpunk with neon green, glitch effects, terminal aesthetic, CRT scanlines",
  "warm cottagecore with soft pastels, handwritten fonts, floral borders, cozy vibes",
  "vaporwave aesthetic with pink/purple gradients, retro grid, chrome text, 80s sunset",
  "minimalist Japanese zen, lots of whitespace, black ink brush strokes, paper texture",
  "underwater deep sea with bioluminescent glow, bubbles, dark blues and teals"
];

type GenerateResult = {
  html: string;
  css: string;
  provider: "codex" | "fallback";
};

export default function VibePage() {
  const [displayName, setDisplayName] = useState("Jack");
  const [bio, setBio] = useState("Full-stack developer who ships fast and breaks things (then fixes them)");
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    const t0 = Date.now();

    try {
      const res = await fetch("/api/profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, displayName, bio, items })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
      } else {
        setResult(data as GenerateResult);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setElapsed(Date.now() - t0);
      setLoading(false);
    }
  }

  function updateItem(idx: number, field: "name" | "price", value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  return (
    <div style={{ padding: "2rem 0" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
          Vibe-Code Your Profile
        </h1>
        <p style={{ color: "#888", marginTop: "0.5rem", fontSize: "0.95rem" }}>
          Describe your vibe and Codex generates a unique profile page with custom HTML &amp; CSS.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left: Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label style={labelStyle}>
            Display Name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              style={inputStyle}
            />
          </label>

          <fieldset style={{ border: "1px solid #333", borderRadius: 8, padding: "0.75rem" }}>
            <legend style={{ color: "#888", fontSize: "0.8rem", padding: "0 0.5rem" }}>Shop Items</legend>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  placeholder="Item name"
                  style={{ ...inputStyle, flex: 2 }}
                />
                <input
                  value={item.price}
                  onChange={(e) => updateItem(i, "price", e.target.value)}
                  placeholder="Price"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            ))}
          </fieldset>

          <label style={labelStyle}>
            Vibe Prompt
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="dark cyberpunk with neon green, glitch effects, terminal aesthetic"
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {SAMPLE_PROMPTS.map((sp, i) => (
              <button
                key={i}
                onClick={() => setPrompt(sp)}
                style={{
                  background: "#1a1a2e",
                  border: "1px solid #333",
                  borderRadius: 20,
                  padding: "0.25rem 0.7rem",
                  color: "#aaa",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  transition: "border-color 0.2s"
                }}
              >
                {sp.slice(0, 40)}...
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: 8,
              border: "none",
              background: loading ? "#333" : "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: loading ? "wait" : "pointer",
              transition: "opacity 0.2s"
            }}
          >
            {loading ? "Generating..." : "Generate Profile"}
          </button>

          {error && (
            <div style={{ background: "#2d1b1b", border: "1px solid #f87171", borderRadius: 8, padding: "0.75rem", color: "#f87171", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.8rem", color: "#888" }}>
              <span
                style={{
                  background: result.provider === "codex" ? "#16a34a22" : "#eab30822",
                  color: result.provider === "codex" ? "#4ade80" : "#facc15",
                  padding: "0.2rem 0.6rem",
                  borderRadius: 12,
                  fontSize: "0.75rem",
                  fontWeight: 600
                }}
              >
                {result.provider === "codex" ? "Codex" : "Fallback"}
              </span>
              <span>{(elapsed / 1000).toFixed(1)}s</span>
              <button
                onClick={() => setShowCode(!showCode)}
                style={{ background: "none", border: "1px solid #444", borderRadius: 6, padding: "0.2rem 0.6rem", color: "#aaa", cursor: "pointer", fontSize: "0.75rem" }}
              >
                {showCode ? "Hide Code" : "Show Code"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div>
          {result ? (
            <>
              <div
                ref={previewRef}
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #333",
                  minHeight: 400
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: result.css }} />
                <div dangerouslySetInnerHTML={{ __html: result.html }} />
              </div>

              {showCode && (
                <div style={{ marginTop: "1rem" }}>
                  <details open>
                    <summary style={{ cursor: "pointer", color: "#888", fontSize: "0.8rem", marginBottom: "0.5rem" }}>HTML</summary>
                    <pre style={codeBlockStyle}>{result.html}</pre>
                  </details>
                  <details open>
                    <summary style={{ cursor: "pointer", color: "#888", fontSize: "0.8rem", marginBottom: "0.5rem", marginTop: "0.75rem" }}>CSS</summary>
                    <pre style={codeBlockStyle}>{result.css}</pre>
                  </details>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                borderRadius: 12,
                border: "1px dashed #333",
                minHeight: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#555",
                fontSize: "0.9rem"
              }}
            >
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: "3px solid #333", borderTopColor: "#7c3aed",
                    animation: "spin 0.8s linear infinite"
                  }} />
                  <span>Codex is designing your profile...</span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                "Your generated profile will appear here"
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  fontSize: "0.85rem",
  color: "#aaa",
  fontWeight: 500
};

const inputStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 8,
  padding: "0.6rem 0.75rem",
  color: "#eee",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  resize: "vertical"
};

const codeBlockStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #222",
  borderRadius: 8,
  padding: "1rem",
  color: "#888",
  fontSize: "0.75rem",
  overflow: "auto",
  maxHeight: 300,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all"
};
