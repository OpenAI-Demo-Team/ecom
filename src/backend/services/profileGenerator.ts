export type ProfileInput = {
  prompt: string;
  displayName: string;
  bio: string;
  items: Array<{ name: string; price: string }>;
};

export type ProfileOutput = {
  html: string;
  css: string;
  provider: "codex" | "fallback";
};

const SYSTEM_PROMPT = `You are a wildly creative profile page designer for a developer social platform called "DevSpace."

Given a user's display name, bio, shop items, and a VIBE DESCRIPTION, you generate a fully self-contained profile page using only HTML and CSS.

ABSOLUTE RULES:
- Return ONLY valid JSON with exactly two keys: { "html": "...", "css": "..." }
- The HTML must be a single root <div class="vibe-profile"> containing everything.
- The CSS must scope EVERY rule under .vibe-profile so it never leaks.
- Include three sections: (1) a header area with the user's name and bio, (2) a product/item grid showing their shop items with names and prices, (3) a footer with a small "Powered by DevSpace" note.
- You MAY and SHOULD use: CSS animations, @keyframes, transforms, gradients, box-shadows, text-shadows, custom cursors (url or keyword), pseudo-elements (::before, ::after), backdrop-filter, mix-blend-mode, border-image, clip-path, mask-image, CSS counters, and any other creative CSS property.
- NEVER output <script> tags, JavaScript, onclick handlers, or any JS.
- NEVER use position:fixed or position:sticky.
- Keep total CSS under 250 lines.
- The design should be DRAMATICALLY different based on the vibe description. A "cyberpunk" request should look NOTHING like a "cottagecore" request.
- Make it feel like a hand-crafted, one-of-a-kind personal page. Surprise and delight.
- Use web-safe or Google Fonts font-family declarations (the page imports Inter already).
- For product cards, display the item name and price prominently.`;

function buildUserPrompt(input: ProfileInput): string {
  const itemList = input.items.length > 0
    ? input.items.map((i) => `- ${i.name} ($${i.price})`).join("\n")
    : "- No items listed yet";

  return [
    `DISPLAY NAME: ${input.displayName}`,
    `BIO: ${input.bio}`,
    `SHOP ITEMS:\n${itemList}`,
    `\nVIBE DESCRIPTION: ${input.prompt}`,
    `\nGenerate the profile now. Return ONLY the JSON object with "html" and "css" keys.`
  ].join("\n");
}

function extractOutputText(payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === "string") return data.output_text;

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    const rec = item as Record<string, unknown>;
    const content = Array.isArray(rec.content) ? rec.content : [];
    for (const part of content) {
      const p = part as Record<string, unknown>;
      if (typeof p.text === "string") chunks.push(p.text);
    }
  }
  return chunks.join("\n");
}

function tryParseProfileJson(text: string): { html: string; css: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof parsed.html === "string" && typeof parsed.css === "string") {
      return { html: parsed.html, css: parsed.css };
    }
  } catch {
    // noop
  }
  return null;
}

function stripScriptTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

export async function generateProfile(input: ProfileInput): Promise<ProfileOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ...buildFallback(input), provider: "fallback" };

  const model = process.env.CODEX_MODEL ?? "gpt-4.1-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) }
        ]
      })
    });

    if (!response.ok) {
      console.error("Codex API error:", response.status, await response.text().catch(() => ""));
      return { ...buildFallback(input), provider: "fallback" };
    }

    const payload = await response.json();
    const text = extractOutputText(payload);
    const parsed = tryParseProfileJson(text);

    if (!parsed) {
      console.error("Failed to parse Codex profile JSON. Raw:", text.slice(0, 500));
      return { ...buildFallback(input), provider: "fallback" };
    }

    return {
      html: stripScriptTags(parsed.html),
      css: parsed.css,
      provider: "codex"
    };
  } catch (err) {
    console.error("Codex profile generation failed:", err);
    return { ...buildFallback(input), provider: "fallback" };
  }
}

function buildFallback(input: ProfileInput): { html: string; css: string } {
  const items = input.items.length > 0
    ? input.items.map((i) => `<div class="vibe-item"><span class="vibe-item-name">${esc(i.name)}</span><span class="vibe-item-price">$${esc(i.price)}</span></div>`).join("\n")
    : '<div class="vibe-item"><span class="vibe-item-name">No items yet</span></div>';

  const html = `<div class="vibe-profile">
  <header class="vibe-header">
    <h1 class="vibe-name">${esc(input.displayName)}</h1>
    <p class="vibe-bio">${esc(input.bio)}</p>
  </header>
  <section class="vibe-shop">
    <h2>Shop</h2>
    <div class="vibe-grid">${items}</div>
  </section>
  <footer class="vibe-footer">Powered by DevSpace</footer>
</div>`;

  const css = `.vibe-profile {
  background: #0a0a0a; color: #0f0; font-family: 'Courier New', monospace;
  padding: 2rem; min-height: 400px; border-radius: 12px; position: relative; overflow: hidden;
}
.vibe-profile::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px);
  pointer-events: none;
}
.vibe-header { text-align: center; margin-bottom: 2rem; }
.vibe-name {
  font-size: 2.5rem; margin: 0; text-shadow: 0 0 10px #0f0, 0 0 40px #0f0;
  animation: vibeGlitch 3s infinite;
}
@keyframes vibeGlitch {
  0%, 90%, 100% { transform: none; }
  92% { transform: translate(-2px, 1px); }
  94% { transform: translate(2px, -1px); }
  96% { transform: translate(-1px, -2px); }
}
.vibe-bio { color: #0a8; font-size: 1rem; margin: 0.5rem 0 0; }
.vibe-shop h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.2em; color: #0f0; border-bottom: 1px solid #0f03; padding-bottom: 0.5rem; }
.vibe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
.vibe-item {
  background: #111; border: 1px solid #0f03; border-radius: 8px; padding: 1rem;
  display: flex; justify-content: space-between; align-items: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.vibe-item:hover { border-color: #0f0; box-shadow: 0 0 12px #0f04; }
.vibe-item-name { font-weight: bold; }
.vibe-item-price { color: #0f0; }
.vibe-footer { text-align: center; margin-top: 2rem; font-size: 0.75rem; color: #0f04; }`;

  return { html, css };
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
