"use client";

import { useState, useEffect, useCallback } from "react";

const vibePresets = [
  "cyberpunk hacker, neon green, CRT scanlines, glitch effects",
  "minimal pink, soft gradients, elegant serif typography",
  "vaporwave retro, chrome text, sunset grid, synthwave",
  "deep sea bioluminescent, glowing teal, bubbles animation",
  "brutalist raw, black & white, thick borders, monospace",
  "cosmic space, galaxy gradient, floating particles, nebula glow",
];

type ShopItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
};

export default function ProfileEditPage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [venmoUsername, setVenmoUsername] = useState("");
  const [cashAppUsername, setCashAppUsername] = useState("");
  const [vibePrompt, setVibePrompt] = useState("");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewCss, setPreviewCss] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    fetch("/api/profile/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setDisplayName(data.displayName ?? "");
        setBio(data.bio ?? "");
        setVenmoUsername(data.venmoUsername ?? "");
        setCashAppUsername(data.cashAppUsername ?? "");
        setVibePrompt(data.vibePrompt ?? "");
        setItems(data.items ?? []);
        setPreviewHtml(data.generatedHtml ?? "");
        setPreviewCss(data.generatedCss ?? "");
      })
      .catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    if (!vibePrompt.trim()) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: vibePrompt,
          displayName: displayName || "Anonymous",
          bio,
          items: items.map((i) => ({ name: i.name, price: String(i.price) })),
        }),
      });
      const data = await res.json();
      if (data.html && data.css) {
        setPreviewHtml(data.html);
        setPreviewCss(data.css);
        const reason =
          typeof data.providerReason === "string" && data.providerReason.trim()
            ? ` ${data.providerReason}`
            : "";
        setMessage({ text: `Generated via ${data.provider === "codex" ? "Codex" : "fallback"}.${reason}`, type: "success" });
      }
    } catch {
      setMessage({ text: "Generation failed. Try again.", type: "error" });
    } finally {
      setGenerating(false);
    }
  }, [vibePrompt, displayName, bio, items]);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, venmoUsername, cashAppUsername, vibePrompt, items }),
      });
      if (res.ok) {
        setMessage({ text: "Profile saved!", type: "success" });
      } else {
        setMessage({ text: "Save failed. Are you logged in?", type: "error" });
      }
    } catch {
      setMessage({ text: "Save failed.", type: "error" });
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, venmoUsername, cashAppUsername, vibePrompt, items]);

  const addItem = () => {
    setItems([...items, { id: `item-${Date.now()}`, name: "", price: 0, description: "", imageUrl: "" }]);
  };

  const updateItem = (idx: number, field: keyof ShopItem, value: string | number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="profile-editor">
      {/* Header */}
      <div className="fade-in-up" style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>
          Profile Editor
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          Vibe-code your profile
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
          Describe your desired aesthetic. Codex will generate custom HTML &amp; CSS for your profile page.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Editor Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} className="fade-in-up">
          {/* Basic Info */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              Basic Info
            </div>
            <div className="editor-form">
              <div className="editor-field">
                <label>Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="editor-field">
                <label>Bio</label>
                <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One-line bio" />
              </div>
              <div className="editor-field">
                <label>Venmo username</label>
                <input value={venmoUsername} onChange={(e) => setVenmoUsername(e.target.value)} placeholder="For shop payments" />
              </div>
              <div className="editor-field">
                <label>Cash App $cashtag</label>
                <input value={cashAppUsername} onChange={(e) => setCashAppUsername(e.target.value)} placeholder="e.g. jackchen" />
              </div>
            </div>
          </div>

          {/* Vibe Prompt */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              Vibe Prompt
            </div>
            <div className="editor-field">
              <label>Describe your aesthetic (add &quot;put shop first&quot; or &quot;reorder tabs&quot; to change layout)</label>
              <textarea
                rows={3}
                value={vibePrompt}
                onChange={(e) => setVibePrompt(e.target.value)}
                placeholder="e.g. cyberpunk hacker, neon green on black, put shop first"
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.75rem 0" }}>
              {vibePresets.map((preset) => (
                <button key={preset} type="button" className="vibe-chip" onClick={() => setVibePrompt(preset)}>
                  {preset.split(",")[0]}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button className="btn btn-primary" onClick={generate} disabled={generating || !vibePrompt.trim()}>
                {generating ? "Generating..." : "Generate with Codex"}
              </button>
              <button className="btn btn-secondary" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
            {message && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: message.type === "success" ? "var(--success)" : message.type === "error" ? "var(--danger)" : "var(--text-secondary)" }}>
                {message.text}
              </p>
            )}
          </div>

          {/* Items */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Shop Items
              </div>
              <button className="btn btn-sm btn-secondary" onClick={addItem}>
                + Add Item
              </button>
            </div>
            {items.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No items yet. Add products to sell on your profile.</p>
            )}
            {items.map((item, idx) => (
              <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginTop: "0.75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "0.5rem" }}>
                  <input value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="Item name" className="editor-field" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "0.85rem" }} />
                  <input type="number" value={item.price} onChange={(e) => updateItem(idx, "price", Number(e.target.value))} placeholder="$" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "0.85rem", width: "100%" }} />
                </div>
                <input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Short description" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "0.85rem", width: "100%", marginTop: "0.5rem" }} />
                <input value={item.imageUrl} onChange={(e) => updateItem(idx, "imageUrl", e.target.value)} placeholder="Image URL" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "0.85rem", width: "100%", marginTop: "0.5rem" }} />
                <button className="btn btn-sm btn-danger" onClick={() => removeItem(idx)} style={{ marginTop: "0.5rem" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Column */}
        <div style={{ position: "sticky", top: "1rem" }} className="fade-in-up">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            Live Preview
          </div>
          <div className="preview-frame">
            {previewHtml ? (
              <div>
                <style dangerouslySetInnerHTML={{ __html: previewCss }} />
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : (
              <div style={{ display: "grid", placeContent: "center", minHeight: 400, color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
                <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>&#127912;</p>
                <p>Enter a vibe prompt and click Generate to preview your profile</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
