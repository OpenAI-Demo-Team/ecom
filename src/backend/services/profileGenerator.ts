import OpenAI from "openai";

export type ProfileInput = {
  prompt: string;
  displayName: string;
  bio: string;
  items: Array<{ name: string; price: string }>;
};

export type ProfileLayout = {
  tabOrder?: string[];
};

export type ProfileOutput = {
  html: string;
  css: string;
  layout?: ProfileLayout;
  provider: "codex" | "fallback";
  providerReason?: string;
};

type ParsedProfile = {
  html: string;
  css: string;
  layout?: ProfileLayout;
};

type FallbackTheme =
  | "cyberpunk"
  | "minimal"
  | "vaporwave"
  | "cosmic"
  | "brutalist"
  | "tropical"
  | "dark-academia"
  | "y2k";

type FallbackProfile = {
  html: string;
  css: string;
  layout?: ProfileLayout;
  theme: FallbackTheme;
};

type CodexRequestResult = {
  parsed: ParsedProfile | null;
  error?: string;
};

const SYSTEM_PROMPT = `You are a wildly creative profile page designer for a developer social platform called "DevSpace."

Given a user's display name, bio, shop items, and a VIBE DESCRIPTION, you generate a fully self-contained profile page using only HTML and CSS.

ABSOLUTE RULES:
- Return ONLY valid JSON. Required keys: "html", "css". Optional key: "layout".
- The HTML must be a single root <div class="vibe-profile">.
- Inside .vibe-profile, include a dedicated decorative layer: <div class="vibe-fx">...</div> for ambient visuals only.
- Put readable profile/shop content under <div class="vibe-content">...</div>.
- The CSS must scope EVERY rule under .vibe-profile so it never leaks.
- Include three sections inside .vibe-content: (1) a header area with the user's name and bio, (2) a product/item grid showing their shop items with names and prices, (3) a footer with a small "Powered by DevSpace" note.
- Place animated decorative elements (particles, overlays, glows, scanlines, stars, etc.) in .vibe-fx so they can render independently from content.
- .vibe-fx must NOT contain readable product names/prices/bio text.
- You MAY and SHOULD use: CSS animations, @keyframes, transforms, gradients, box-shadows, text-shadows, custom cursors (url or keyword), pseudo-elements (::before, ::after), backdrop-filter, mix-blend-mode, border-image, clip-path, mask-image, CSS counters, and any other creative CSS property.
- NEVER output <script> tags, JavaScript, onclick handlers, or any JS.
- NEVER use position:fixed or position:sticky.
- Keep total CSS under 250 lines.
- The design should be WILDLY, DRASTICALLY different based on the vibe description. A "cyberpunk" request should look NOTHING like a "cottagecore" request. GO ALL OUT. Push CSS to its limits.
- Make it feel like a hand-crafted, one-of-a-kind personal page. Surprise and delight. Be BOLD. Use huge text, insane gradients, wild animations, dramatic layouts.
- Use web-safe or Google Fonts font-family declarations (the page imports Inter already).
- For product cards, display the item name and price prominently.
- When the user asks for drastic changes, COMPLETELY reimagine the page. Don't just tweak colors - change everything: fonts, spacing, animations, layout direction, decorative elements.

LAYOUT (optional): If the vibe description mentions layout preferences (e.g. "put shop first", "reorder tabs", "shop before posts", "prioritize my products"), include a "layout" object: { "tabOrder": ["shop", "posts", "friends"] }. Valid tab ids: "posts", "shop", "friends". Order them as the user prefers. If no layout preference, omit "layout" or use default order.`;
const JSON_REPAIR_SYSTEM_PROMPT = `You repair model output into strict JSON for a DevSpace profile generator.
Return ONLY a valid JSON object with keys:
- "html": string
- "css": string
- optional "layout": { "tabOrder": ["posts"|"shop"|"friends", ...] }
No markdown, no explanation, no extra keys.`;

const VALID_TABS = ["posts", "shop", "friends"] as const;
type TabId = (typeof VALID_TABS)[number];
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
type ReasoningEffort = "low" | "medium" | "high";

const DEFAULT_CODEX_MODEL = "gpt-5.3-codex";
const STRONG_FALLBACK_CODEX_MODEL = "gpt-5.1-codex-max";
const FAST_FALLBACK_CODEX_MODEL = "gpt-5.1-codex-mini";

function getCodexModel(): string {
  const configured = (process.env.CODEX_MODEL ?? DEFAULT_CODEX_MODEL).trim();
  return /codex/i.test(configured) ? configured : DEFAULT_CODEX_MODEL;
}

function readEnvInt(name: string, defaultValue: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? defaultValue);
  if (!Number.isFinite(raw)) return defaultValue;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

function readReasoningEffort(name: string, defaultValue: ReasoningEffort): ReasoningEffort {
  const raw = String(process.env[name] ?? defaultValue).trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return defaultValue;
}

const FALLBACK_BASE_CSS = `.vibe-profile{
  position:relative;
  min-height:480px;
  padding:2rem;
  overflow:hidden;
}
.vibe-profile .vibe-fx{
  position:absolute;
  inset:0;
  pointer-events:none;
  overflow:hidden;
  z-index:0;
}
.vibe-profile .vibe-fx .vibe-deco,
.vibe-profile .vibe-deco{
  position:absolute;
  pointer-events:none;
  z-index:0;
}
.vibe-profile .vibe-content{
  position:relative;
  z-index:1;
}
.vibe-profile .vibe-header,
.vibe-profile .vibe-shop,
.vibe-profile .vibe-footer{
  position:relative;
  z-index:1;
}
.vibe-profile .vibe-header{
  margin-bottom:1.5rem;
}
.vibe-profile .vibe-name{
  margin:0;
  font-size:clamp(2rem, 5vw, 3.25rem);
  line-height:1;
}
.vibe-profile .vibe-bio{
  margin:0.6rem 0 0;
  max-width:70ch;
  font-size:0.95rem;
}
.vibe-profile .vibe-shop h2{
  margin:0 0 0.8rem;
  font-size:0.95rem;
  letter-spacing:0.08em;
  text-transform:uppercase;
}
.vibe-profile .vibe-grid{
  display:grid;
  gap:0.9rem;
  grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
}
.vibe-profile .vibe-item{
  padding:0.9rem;
  border:1px solid currentColor;
  display:grid;
  gap:0.35rem;
}
.vibe-profile .vibe-item-name{
  font-weight:700;
  font-size:1rem;
}
.vibe-profile .vibe-item-price{
  font-size:1.15rem;
  font-weight:800;
}
.vibe-profile .vibe-footer{
  margin-top:1.5rem;
  font-size:0.78rem;
  opacity:0.8;
}`;

const FALLBACK_THEME_CSS: Record<FallbackTheme, string> = {
  cyberpunk: `.vibe-profile.theme-cyberpunk{
  background:#030a03;
  color:#22ff77;
  font-family:'Courier New',monospace;
  cursor:crosshair;
}
.vibe-profile.theme-cyberpunk::before{
  content:'';
  position:absolute;
  inset:0;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(34,255,119,0.07) 2px 3px);
}
.vibe-profile.theme-cyberpunk .vibe-name{
  text-shadow:0 0 10px rgba(34,255,119,0.9),0 0 30px rgba(34,255,119,0.55),0 0 50px rgba(34,255,119,0.3);
}
.vibe-profile.theme-cyberpunk .vibe-item{
  background:rgba(0,0,0,0.6);
  border-color:rgba(34,255,119,0.45);
  box-shadow:inset 0 0 0 1px rgba(34,255,119,0.12);
}
.vibe-profile.theme-cyberpunk .vibe-item:hover{
  box-shadow:0 0 18px rgba(34,255,119,0.35),0 0 40px rgba(34,255,119,0.2);
}
.vibe-profile.theme-cyberpunk .vibe-deco-a{
  inset:-10% -20% auto auto;
  width:340px;
  height:180px;
  background:radial-gradient(circle at 20% 20%,rgba(34,255,119,0.45),transparent 70%);
}
.vibe-profile.theme-cyberpunk .vibe-deco-b{
  inset:0;
  width:100%;
  height:100%;
  background-image:
    radial-gradient(circle at 15% 15%,rgba(34,255,119,0.35) 0 1px,transparent 1px),
    radial-gradient(circle at 70% 25%,rgba(34,255,119,0.25) 0 1px,transparent 1px),
    radial-gradient(circle at 40% 70%,rgba(34,255,119,0.18) 0 1px,transparent 1px);
  background-size:120px 120px,160px 160px,90px 90px;
  opacity:0.55;
}`,
  minimal: `.vibe-profile.theme-minimal{
  background:linear-gradient(160deg,#fffaf4 0%,#f8f4ff 100%);
  color:#3b2d50;
  font-family:Georgia,'Times New Roman',serif;
  padding:3rem;
}
.vibe-profile.theme-minimal .vibe-name{
  font-weight:400;
  letter-spacing:0.02em;
}
.vibe-profile.theme-minimal .vibe-bio{
  color:#6d6380;
  max-width:60ch;
}
.vibe-profile.theme-minimal .vibe-shop h2{
  border-bottom:1px solid rgba(59,45,80,0.2);
  padding-bottom:0.55rem;
}
.vibe-profile.theme-minimal .vibe-item{
  background:rgba(255,255,255,0.75);
  border:1px solid rgba(59,45,80,0.18);
  border-radius:14px;
}
.vibe-profile.theme-minimal .vibe-item-price{
  color:#a04575;
}
.vibe-profile.theme-minimal .vibe-deco-a{
  top:-50px;
  right:-40px;
  width:220px;
  height:220px;
  border-radius:50%;
  background:rgba(232,207,255,0.5);
}
.vibe-profile.theme-minimal .vibe-deco-b{
  bottom:-70px;
  left:-30px;
  width:180px;
  height:180px;
  border-radius:50%;
  background:rgba(255,201,226,0.42);
}`,
  vaporwave: `.vibe-profile.theme-vaporwave{
  background:linear-gradient(180deg,#ff79c8 0%,#b76bff 46%,#3ec8c8 100%);
  color:#ffffff;
  font-family:Impact,'Arial Black',sans-serif;
}
.vibe-profile.theme-vaporwave::after{
  content:'';
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  height:45%;
  background:
    repeating-linear-gradient(90deg,rgba(255,255,255,0.2) 0 1px,transparent 1px 52px),
    repeating-linear-gradient(0deg,rgba(255,255,255,0.2) 0 1px,transparent 1px 38px);
  transform:perspective(420px) rotateX(52deg);
  transform-origin:bottom;
  opacity:0.45;
}
.vibe-profile.theme-vaporwave .vibe-name{
  text-transform:uppercase;
  letter-spacing:0.08em;
}
.vibe-profile.theme-vaporwave .vibe-item{
  background:rgba(255,255,255,0.14);
  border:1px solid rgba(255,255,255,0.36);
  border-radius:10px;
  backdrop-filter:blur(5px);
}
.vibe-profile.theme-vaporwave .vibe-item-price{
  color:#fff48a;
}
.vibe-profile.theme-vaporwave .vibe-deco-a{
  top:26%;
  left:0;
  right:0;
  height:64px;
  background:repeating-linear-gradient(0deg,rgba(255,170,122,0.85) 0 5px,transparent 5px 10px);
  opacity:0.26;
}
.vibe-profile.theme-vaporwave .vibe-deco-b{
  display:none;
}`,
  cosmic: `.vibe-profile.theme-cosmic{
  background:#090018;
  color:#e0d8ff;
  font-family:'Trebuchet MS',Arial,sans-serif;
}
.vibe-profile.theme-cosmic::before{
  content:'';
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 10% 20%,rgba(133,88,255,0.35),transparent 30%),
    radial-gradient(circle at 90% 0%,rgba(255,121,189,0.28),transparent 28%),
    radial-gradient(circle at 40% 70%,rgba(119,221,255,0.2),transparent 32%);
}
.vibe-profile.theme-cosmic::after{
  content:'';
  position:absolute;
  inset:0;
  background-image:radial-gradient(rgba(255,255,255,0.8) 0.9px,transparent 1px);
  background-size:28px 28px;
  opacity:0.38;
}
.vibe-profile.theme-cosmic .vibe-item{
  background:rgba(21,12,45,0.7);
  border-color:rgba(189,153,255,0.45);
  border-radius:12px;
}
.vibe-profile.theme-cosmic .vibe-item-price{
  color:#ff8fd1;
}
.vibe-profile.theme-cosmic .vibe-deco-a{
  top:-70px;
  right:-50px;
  width:260px;
  height:260px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(199,160,255,0.45),transparent 70%);
}
.vibe-profile.theme-cosmic .vibe-deco-b{
  bottom:-80px;
  left:-50px;
  width:220px;
  height:220px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(255,128,191,0.35),transparent 72%);
}`,
  brutalist: `.vibe-profile.theme-brutalist{
  background:#ffffff;
  color:#000000;
  font-family:'Courier New',monospace;
  text-transform:uppercase;
}
.vibe-profile.theme-brutalist .vibe-name{
  font-size:3rem;
  letter-spacing:0.01em;
}
.vibe-profile.theme-brutalist .vibe-bio{
  font-size:0.85rem;
}
.vibe-profile.theme-brutalist .vibe-shop h2{
  border-top:4px solid #000;
  border-bottom:4px solid #000;
  padding:0.55rem 0;
}
.vibe-profile.theme-brutalist .vibe-grid{
  gap:0;
}
.vibe-profile.theme-brutalist .vibe-item{
  border:4px solid #000;
  margin:-2px 0 0 -2px;
  border-radius:0;
  background:#fff;
}
.vibe-profile.theme-brutalist .vibe-footer{
  border-top:4px solid #000;
  padding-top:0.65rem;
}
.vibe-profile.theme-brutalist .vibe-deco-a,
.vibe-profile.theme-brutalist .vibe-deco-b{
  display:none;
}`,
  tropical: `.vibe-profile.theme-tropical{
  background:linear-gradient(135deg,#ff2a80 0%,#ff7f11 44%,#59e900 100%);
  color:#102900;
  font-family:Verdana,Geneva,Tahoma,sans-serif;
}
.vibe-profile.theme-tropical .vibe-name{
  color:#ffffff;
  text-shadow:0 4px 0 rgba(0,0,0,0.23);
}
.vibe-profile.theme-tropical .vibe-item{
  background:rgba(255,255,255,0.78);
  border-color:rgba(16,41,0,0.26);
  border-radius:16px;
  transform:rotate(-1deg);
}
.vibe-profile.theme-tropical .vibe-item:nth-child(even){
  transform:rotate(1.3deg);
}
.vibe-profile.theme-tropical .vibe-item-price{
  color:#0f7b00;
}
.vibe-profile.theme-tropical .vibe-deco-a{
  top:-80px;
  right:-40px;
  width:260px;
  height:260px;
  border-radius:55% 45% 70% 30%;
  background:rgba(255,255,255,0.24);
}
.vibe-profile.theme-tropical .vibe-deco-b{
  bottom:-110px;
  left:-30px;
  width:220px;
  height:220px;
  border-radius:35% 65% 40% 60%;
  background:rgba(255,255,255,0.2);
}`,
  "dark-academia": `.vibe-profile.theme-dark-academia{
  background:linear-gradient(165deg,#f4e8d3 0%,#ead8be 100%);
  color:#3b2a20;
  font-family:Georgia,'Times New Roman',serif;
}
.vibe-profile.theme-dark-academia .vibe-name{
  letter-spacing:0.03em;
}
.vibe-profile.theme-dark-academia .vibe-bio{
  color:#5d4636;
}
.vibe-profile.theme-dark-academia .vibe-shop h2{
  border-bottom:1px solid rgba(59,42,32,0.35);
  padding-bottom:0.6rem;
}
.vibe-profile.theme-dark-academia .vibe-item{
  background:rgba(255,248,235,0.75);
  border-color:rgba(59,42,32,0.35);
  border-radius:2px;
  box-shadow:0 8px 20px rgba(90,62,45,0.12);
}
.vibe-profile.theme-dark-academia .vibe-item-price{
  color:#6f3f2a;
}
.vibe-profile.theme-dark-academia .vibe-deco-a{
  top:-60px;
  right:-30px;
  width:240px;
  height:240px;
  border-radius:20% 80% 35% 65%;
  background:rgba(117,80,56,0.12);
}
.vibe-profile.theme-dark-academia .vibe-deco-b{
  bottom:-90px;
  left:-40px;
  width:220px;
  height:220px;
  border-radius:50%;
  background:rgba(117,80,56,0.08);
}`,
  y2k: `.vibe-profile.theme-y2k{
  background:linear-gradient(145deg,#ff73c6 0%,#89d7ff 45%,#fff6a6 100%);
  color:#3f2457;
  font-family:'Trebuchet MS',Verdana,sans-serif;
}
.vibe-profile.theme-y2k .vibe-name{
  text-shadow:0 2px 0 rgba(255,255,255,0.9),0 0 14px rgba(255,255,255,0.7);
}
.vibe-profile.theme-y2k .vibe-item{
  background:rgba(255,255,255,0.5);
  border-color:rgba(255,255,255,0.9);
  border-radius:18px;
  box-shadow:0 10px 24px rgba(80,40,120,0.16),inset 0 0 18px rgba(255,255,255,0.4);
}
.vibe-profile.theme-y2k .vibe-item-price{
  color:#b50078;
}
.vibe-profile.theme-y2k .vibe-deco-a{
  top:-70px;
  right:-40px;
  width:240px;
  height:240px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,0.78),rgba(255,255,255,0.15) 65%,transparent 70%);
}
.vibe-profile.theme-y2k .vibe-deco-b{
  bottom:-80px;
  left:-30px;
  width:200px;
  height:200px;
  border-radius:45% 55% 55% 45%;
  background:rgba(255,255,255,0.35);
}`,
};

function sanitizePrompt(prompt: string): string {
  return prompt.trim().slice(0, 1200);
}

function buildUserPrompt(input: ProfileInput): string {
  const itemList =
    input.items.length > 0
      ? input.items.map((i) => `- ${i.name} ($${i.price})`).join("\n")
      : "- No items listed yet";
  const asksForDrasticChange = /\b(drastic|reimagine|overhaul|radical|complete\s+change|from\s+scratch)\b/i.test(input.prompt);

  return [
    `DISPLAY NAME: ${input.displayName}`,
    `BIO: ${input.bio}`,
    `SHOP ITEMS:\n${itemList}`,
    `\nVIBE DESCRIPTION: ${input.prompt}`,
    asksForDrasticChange
      ? "\nIMPORTANT: The user asked for a drastic change. Replace the entire visual language (typography, spacing, layout, colors, effects)."
      : "",
    `\nGenerate the profile now. Return ONLY the JSON object with "html", "css", and optional "layout".`,
  ].join("\n");
}

function extractOutputText(payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;

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

function stripCodeFence(text: string): string {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text.trim();
}

function normalizeTabOrder(order: string[]): string[] {
  const deduped = Array.from(new Set(order))
    .map((item) => item.toLowerCase())
    .filter((item): item is TabId => VALID_TABS.includes(item as TabId));
  return [...deduped, ...VALID_TABS.filter((tab) => !deduped.includes(tab))];
}

function parseLayout(layoutInput: unknown): ProfileLayout | undefined {
  if (!layoutInput || typeof layoutInput !== "object") return undefined;
  const rec = layoutInput as Record<string, unknown>;
  if (!Array.isArray(rec.tabOrder)) return undefined;
  const tabOrder = normalizeTabOrder(rec.tabOrder.map((item) => String(item)));
  return tabOrder.length > 0 ? { tabOrder } : undefined;
}

function tryParseProfileJson(text: string): ParsedProfile | null {
  const candidate = stripCodeFence(text);

  const parse = (raw: string): ParsedProfile | null => {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.html !== "string" || typeof parsed.css !== "string") return null;
      return {
        html: parsed.html,
        css: parsed.css,
        layout: parseLayout(parsed.layout),
      };
    } catch {
      return null;
    }
  };

  const direct = parse(candidate);
  if (direct) return direct;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return parse(candidate.slice(start, end + 1));
}

async function repairProfileJson(
  client: OpenAI,
  model: string,
  maxOutputTokens: number,
  rawText: string,
): Promise<ParsedProfile | null> {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    const repair = await client.responses.create({
      model,
      reasoning: { effort: "low" },
      max_output_tokens: Math.max(800, Math.min(2200, Math.floor(maxOutputTokens * 0.75))),
      input: [
        { role: "system", content: JSON_REPAIR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "Convert this assistant output into valid JSON using the required schema.",
            "Keep the intended HTML/CSS theme content.",
            "Return JSON only.",
            "",
            "ASSISTANT OUTPUT:",
            trimmed.slice(0, 14_000),
          ].join("\n"),
        },
      ],
    });
    return tryParseProfileJson(extractOutputText(repair));
  } catch {
    return null;
  }
}

function sanitizeGeneratedHtml(html: string): string {
  let safe = html;
  safe = safe.replace(/<script[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/<style[\s\S]*?<\/style>/gi, "");
  safe = safe.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  safe = safe.replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");
  safe = safe.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
  safe = safe.trim();
  if (!safe) return "";

  const hasRoot = /^<div\b[^>]*class=(['"])[^'"]*\bvibe-profile\b[^'"]*\1/i.test(safe);
  if (!hasRoot) {
    safe = `<div class="vibe-profile">${safe}</div>`;
  }

  return safe;
}

function sanitizeGeneratedCss(css: string): string {
  let safe = css;
  safe = safe.replace(/@import[^;]*;/gi, "");
  safe = safe.replace(/url\(\s*(['"]?)javascript:[\s\S]*?\1\s*\)/gi, "none");
  safe = safe.replace(/position\s*:\s*(fixed|sticky)\s*;/gi, "position: relative;");
  safe = safe.trim();

  const lines = safe.split("\n");
  if (lines.length > 250) {
    safe = lines.slice(0, 250).join("\n");
  }
  return safe;
}

function isValidGeneratedProfile(profile: ParsedProfile): boolean {
  return (
    profile.html.trim().length > 0 &&
    profile.css.trim().length > 0 &&
    profile.html.includes("vibe-profile") &&
    profile.css.includes(".vibe-profile")
  );
}

function keywordIndex(prompt: string, words: string[]): number {
  let idx = -1;
  for (const word of words) {
    const nextIdx = prompt.indexOf(word);
    if (nextIdx !== -1 && (idx === -1 || nextIdx < idx)) idx = nextIdx;
  }
  return idx;
}

function inferLayoutFromPrompt(prompt: string): ProfileLayout | undefined {
  const lower = prompt.toLowerCase();

  if (/shop\s+(first|before)|products?\s+first|store\s+first|prioriti[sz]e\s+(shop|products?)/.test(lower)) {
    return { tabOrder: ["shop", "posts", "friends"] };
  }
  if (/friends?\s+(first|before)|network\s+first|connections?\s+first/.test(lower)) {
    return { tabOrder: ["friends", "posts", "shop"] };
  }
  if (/posts?\s+(first|before)|feed\s+first|timeline\s+first/.test(lower)) {
    return { tabOrder: ["posts", "shop", "friends"] };
  }

  const ordered = [
    { tab: "posts" as const, idx: keywordIndex(lower, ["posts", "post", "feed", "timeline"]) },
    { tab: "shop" as const, idx: keywordIndex(lower, ["shop", "store", "product", "products", "item", "items"]) },
    { tab: "friends" as const, idx: keywordIndex(lower, ["friends", "friend", "network", "connections"]) },
  ]
    .filter((entry) => entry.idx !== -1)
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => entry.tab);

  if (ordered.length < 2) return undefined;
  return { tabOrder: normalizeTabOrder(ordered) };
}

function pickFallbackTheme(prompt: string): FallbackTheme {
  const lower = prompt.toLowerCase();
  if (/(cyber|cyberpunk|cyberpubk|hacker|neon|terminal|matrix|crt|glitch)/.test(lower)) return "cyberpunk";
  if (/(dark\s*academia|academia|library|parchment|sepia|vintage|ornamental|book)/.test(lower)) return "dark-academia";
  if (/(y2k|2000|bubblegum|sparkle|cute|frosted|comic|glossy)/.test(lower)) return "y2k";
  if (/(minimal|zen|clean|elegant|soft|pastel)/.test(lower)) return "minimal";
  if (/(vaporwave|retro|synth|chrome|sunset)/.test(lower)) return "vaporwave";
  if (/(cosmic|space|galaxy|nebula|star|astral)/.test(lower)) return "cosmic";
  if (/(brutalist|raw|monospace|newspaper|black\s*&?\s*white)/.test(lower)) return "brutalist";
  if (/(tropical|maximal|party|neon\s+pink|lime|jungle)/.test(lower)) return "tropical";

  const all: FallbackTheme[] = ["cyberpunk", "minimal", "vaporwave", "cosmic", "brutalist", "tropical", "dark-academia", "y2k"];
  let hash = 0;
  for (let i = 0; i < lower.length; i += 1) {
    hash = (hash * 31 + lower.charCodeAt(i)) | 0;
  }
  return all[Math.abs(hash) % all.length];
}

function buildFallback(input: ProfileInput): FallbackProfile {
  const theme = pickFallbackTheme(input.prompt);
  const layout = inferLayoutFromPrompt(input.prompt);
  const items =
    input.items.length > 0
      ? input.items
          .map(
            (item) =>
              `<div class="vibe-item"><span class="vibe-item-name">${esc(item.name)}</span><span class="vibe-item-price">$${esc(item.price)}</span></div>`,
          )
          .join("\n")
      : `<div class="vibe-item"><span class="vibe-item-name">No items yet</span><span class="vibe-item-price">$0</span></div>`;

  const html = `<div class="vibe-profile theme-${theme}">
  <div class="vibe-fx">
    <div class="vibe-deco vibe-deco-a"></div>
    <div class="vibe-deco vibe-deco-b"></div>
  </div>
  <div class="vibe-content">
    <header class="vibe-header">
      <h1 class="vibe-name">${esc(input.displayName)}</h1>
      <p class="vibe-bio">${esc(input.bio)}</p>
    </header>
    <section class="vibe-shop">
      <h2>Shop</h2>
      <div class="vibe-grid">${items}</div>
    </section>
    <footer class="vibe-footer">Powered by DevSpace</footer>
  </div>
</div>`;

  return {
    html,
    css: `${FALLBACK_BASE_CSS}\n${FALLBACK_THEME_CSS[theme]}`,
    layout,
    theme,
  };
}

async function requestProfileFromCodex(input: ProfileInput, apiKey: string): Promise<CodexRequestResult> {
  const configuredModel = getCodexModel();
  const timeoutMs = readEnvInt("CODEX_TIMEOUT_MS", 45_000, 10_000, 180_000);
  const maxOutputTokens = readEnvInt("CODEX_MAX_OUTPUT_TOKENS", 3200, 1000, 5000);
  const preferredEffort = readReasoningEffort("CODEX_REASONING_EFFORT", "medium");
  const modelCandidates = Array.from(new Set([configuredModel, STRONG_FALLBACK_CODEX_MODEL, FAST_FALLBACK_CODEX_MODEL]));
  const client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  let lastError = "Network/API error while calling OpenAI.";

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const effort: ReasoningEffort = model === configuredModel ? preferredEffort : "low";
        const payload = await client.responses.create({
          model,
          reasoning: { effort },
          max_output_tokens: maxOutputTokens,
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(input) },
          ],
        });
        const text = extractOutputText(payload);
        const parsed = tryParseProfileJson(text);
        if (!parsed) {
          const repaired = await repairProfileJson(client, model, maxOutputTokens, text);
          if (repaired) {
            return { parsed: repaired };
          }
          console.error("Failed to parse Codex profile JSON. Raw:", text.slice(0, 500));
          lastError = `Codex response was not valid profile JSON (${model}).`;
          break;
        }
        return { parsed };
      } catch (err) {
        const status =
          typeof err === "object" && err && "status" in err && typeof (err as { status?: unknown }).status === "number"
            ? ((err as { status: number }).status)
            : undefined;
        const message =
          typeof err === "object" && err && "message" in err && typeof (err as { message?: unknown }).message === "string"
            ? (err as { message: string }).message
            : "";

        if (status) {
          lastError = `OpenAI request failed (${status}) on ${model}.`;
        } else if (/timed out/i.test(message)) {
          lastError = `OpenAI request timed out on ${model} after ${timeoutMs}ms.`;
        } else {
          lastError = `Network/API error while calling OpenAI on ${model}.`;
        }

        if (status && RETRYABLE_STATUS.has(status) && attempt === 0) {
          continue;
        }
        if (!status && attempt === 0) {
          continue;
        }

        console.error("Codex profile generation failed:", err);
        break;
      }
    }
  }

  return { parsed: null, error: lastError };
}

export async function generateProfile(input: ProfileInput): Promise<ProfileOutput> {
  const sanitizedInput: ProfileInput = {
    ...input,
    prompt: sanitizePrompt(input.prompt),
  };
  const fallback = buildFallback(sanitizedInput);
  const { theme, ...fallbackProfile } = fallback;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ...fallbackProfile,
      provider: "fallback",
      providerReason: `OPENAI_API_KEY is not set. Using fallback theme: ${theme}.`,
    };
  }

  const codexResult = await requestProfileFromCodex(sanitizedInput, apiKey);
  if (!codexResult.parsed) {
    return {
      ...fallbackProfile,
      provider: "fallback",
      providerReason: `${codexResult.error ?? "OpenAI request failed."} Using fallback theme: ${theme}.`,
    };
  }

  const profile: ParsedProfile = {
    html: sanitizeGeneratedHtml(codexResult.parsed.html),
    css: sanitizeGeneratedCss(codexResult.parsed.css),
    layout: codexResult.parsed.layout ?? inferLayoutFromPrompt(sanitizedInput.prompt),
  };

  if (!isValidGeneratedProfile(profile)) {
    return {
      ...fallbackProfile,
      provider: "fallback",
      providerReason: `Codex output failed validation. Using fallback theme: ${theme}.`,
    };
  }

  return { ...profile, provider: "codex" };
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
