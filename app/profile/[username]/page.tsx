"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Me = { username: string } | null;

type ShopItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
};

type Friend = {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
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

type ThemeSnapshot = {
  prompt: string;
  html: string;
  css: string;
};

type ThemeChange = {
  base: ThemeSnapshot;
  head: ThemeSnapshot;
};

type PrDraft = {
  provider: "codex" | "fallback";
  providerReason?: string;
  title: string;
  body: string;
  branchName: string;
  diff: string;
  github?: {
    status: "created" | "skipped" | "failed";
    url?: string;
    message: string;
  };
};

type Profile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  venmoUsername?: string;
  cashAppUsername?: string;
  vibePrompt: string;
  generatedHtml: string;
  generatedCss: string;
  layout?: { tabOrder?: string[] };
  provider: string;
  items: ShopItem[];
  friends: string[];
};

type ProfileData = {
  profile: Profile;
  posts: Post[];
  friends: Friend[];
};

type Tab = "posts" | "shop" | "friends";
type ChatMsg = { role: "user" | "system"; text: string; ts: number };

const DRASTIC_PROMPTS = [
  { label: "Neon Cyberpunk", prompt: "DRASTIC CHANGE: neon cyberpunk hacker terminal, pitch black background, electric green #00ff41 text, CRT scanline overlay, glitch animation on name, matrix-rain-inspired decorative dots, monospace font, item cards with neon green borders that glow on hover" },
  { label: "Y2K Bubblegum", prompt: "DRASTIC CHANGE: Y2K early-2000s aesthetic, bubblegum pink (#ff69b4) and baby blue (#87ceeb) gradient background, chunky rounded comic-sans-like font, glossy 3D text with text-shadow, sparkle star decorations using ::before/::after, card backgrounds with frosted glass effect, everything cute and playful" },
  { label: "Brutalist B&W", prompt: "DRASTIC CHANGE: brutalist raw design, pure white background, pure black text, monospace font, ALL CAPS text-transform, thick 4px solid black borders on everything, zero border-radius, harsh grid layout, newspaper column feel, no gradients, no shadows, no animations, dotted separators" },
  { label: "Cosmic Nebula", prompt: "DRASTIC CHANGE: deep space cosmic theme, background gradient from #0b0015 to #1a0030, floating particle dots animated with CSS keyframes, galaxy purple (#c7a0ff) and nebula pink (#ff80bf) accents, ethereal thin fonts, cards with subtle aurora glow borders, starfield pattern using radial-gradients" },
  { label: "Vaporwave", prompt: "DRASTIC CHANGE: full vaporwave aesthetic, sunset gradient background pink to purple to teal, retro perspective grid floor at bottom using CSS transforms, chrome metallic gradient text, Impact font, horizontal sunset stripe lines, items in glass-morphism cards with heavy backdrop-filter blur" },
  { label: "Dark Academia", prompt: "DRASTIC CHANGE: dark academia library aesthetic, warm parchment background #f5e6d0, dark brown #3d2b1f text, elegant serif font Georgia, decorative ornamental borders using border-image, sepia-toned cards, vintage book spine layout feel, subtle paper texture using repeating gradients, candlelight warm glow shadows" },
  { label: "Tropical Party", prompt: "DRASTIC CHANGE: tropical maximalist explosion, hot pink #ff1493 and lime green #32cd32 clashing gradient background, bold chunky Impact font, palm leaf decorations using clip-path, cards that rotate slightly on hover, wild pulsing animations, everything loud and bold, party energy" },
  { label: "Minimal Zen", prompt: "DRASTIC CHANGE: ultra minimal zen, pure off-white #fafafa background, barely-there gray #ccc text, massive whitespace padding, tiny 0.75rem monospace font, single 1px hairline borders, no shadows, no animations, maximum negative space, items as simple text lines with prices right-aligned" },
];

const STYLE_SIGNAL_PATTERN = /(cyber|neon|minimal|vaporwave|cosmic|tropical|brutalist|academia|y2k|pink|galaxy|theme|aesthetic|style)/i;
const PR_URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const AMBIENT_EMPTY_HTML = `<div class="vibe-profile vibe-profile-ambient"></div>`;
const AMBIENT_RAIN_COUNT = 18;
const AMBIENT_FX_SELECTOR = [
  ".vibe-fx",
  "[class*='vibe-fx']",
  "[class*='deco']",
  "[class*='overlay']",
  "[class*='particle']",
  "[class*='star']",
  "[class*='glow']",
  "[class*='orb']",
  "[class*='blob']",
  "[class*='spark']",
  "[class*='noise']",
  "[class*='grid']",
  "[class*='float']",
  "[class*='stripe']",
  "[class*='scan']",
  "[class*='crt']",
  "[class*='nebula']",
  "[class*='aurora']",
].join(",");

function buildContextualPrompt(previousVibe: string, prompt: string): string {
  const trimmed = prompt.trim();
  if (!previousVibe.trim()) return trimmed;
  if (trimmed.length > 90 || STYLE_SIGNAL_PATTERN.test(trimmed)) return trimmed;

  return [
    `BASE THEME CONTEXT: ${previousVibe.trim()}`,
    `ADJUSTMENT REQUEST: ${trimmed}`,
    "Keep the existing visual identity and apply only the requested changes.",
  ].join("\n");
}

function buildAmbientRainHtml(): string {
  const lines = Array.from({ length: AMBIENT_RAIN_COUNT }, (_, i) => {
    const x = ((i * 37) % 100) + 0.4;
    const duration = 7 + (i % 6) * 1.35;
    const delay = -(i * 0.85);
    const opacity = 0.12 + (i % 5) * 0.07;
    return `<span style="--x:${x.toFixed(2)}%;--dur:${duration.toFixed(2)}s;--delay:${delay.toFixed(2)}s;--op:${opacity.toFixed(2)}"></span>`;
  }).join("");
  return `<div class="ambient-rain">${lines}</div>`;
}

function extractAnimatedClassNames(rawCss: string): Set<string> {
  const classes = new Set<string>();
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");
  const blockPattern = /([^{}]+)\{([^{}]+)\}/g;
  let match: RegExpExecArray | null = null;
  while ((match = blockPattern.exec(css))) {
    const selectors = match[1];
    const body = match[2];
    if (!/\banimation(?:-name)?\s*:/.test(body)) continue;
    let classMatch: RegExpExecArray | null = null;
    const classPattern = /\.([_a-zA-Z][\w-]*)/g;
    while ((classMatch = classPattern.exec(selectors))) {
      if (classMatch[1] !== "vibe-profile") classes.add(classMatch[1]);
    }
  }
  return classes;
}

function hasBlockedCommerceClass(node: HTMLElement): boolean {
  const cls = node.className;
  if (typeof cls !== "string" || !cls.trim()) return false;
  return /\b(vp-shop|vibe-shop|shop|store|catalog|items?-grid|vibe-grid|vibe-item|item-card|item-name|item-price|item-desc|vp-item|shop-item-clickable|product|price|pricing|cart|checkout|card|cards)\b/.test(cls);
}

function stripTextNodesDeep(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const textNode of textNodes) {
    if ((textNode.textContent ?? "").trim().length > 0) {
      textNode.textContent = "";
    }
  }
}

function sanitizeAmbientClone(source: HTMLElement): HTMLElement | null {
  if (hasBlockedCommerceClass(source)) return null;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute("aria-hidden", "true");

  const descendants = [clone, ...Array.from(clone.querySelectorAll("*")).filter((n): n is HTMLElement => n instanceof HTMLElement)];
  for (const el of descendants) {
    if (hasBlockedCommerceClass(el)) {
      el.remove();
      continue;
    }
    if (el.matches("a, button, input, textarea, select, form")) {
      el.remove();
      continue;
    }
  }

  stripTextNodesDeep(clone);
  return clone;
}

function extractAmbientCanvasHtml(rawHtml: string, rawCss: string): string {
  if (!rawHtml.trim()) return AMBIENT_EMPTY_HTML;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");
    const root = doc.body.querySelector(".vibe-profile");
    if (!(root instanceof HTMLElement)) return AMBIENT_EMPTY_HTML;

    const ambientRoot = root.cloneNode(false) as HTMLElement;
    ambientRoot.classList.add("vibe-profile-ambient");

    const heuristicNodes = Array.from(root.querySelectorAll(AMBIENT_FX_SELECTOR)).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
    const animatedClassNames = extractAnimatedClassNames(rawCss);
    const animatedNodes: HTMLElement[] = [];
    for (const cls of animatedClassNames) {
      const nodes = Array.from(root.getElementsByClassName(cls)).filter((node): node is HTMLElement => node instanceof HTMLElement);
      animatedNodes.push(...nodes);
    }

    const merged = Array.from(new Set([...heuristicNodes, ...animatedNodes])).filter((node) => {
      if (hasBlockedCommerceClass(node)) return false;
      if (node.querySelector("a, button, input, textarea, select")) return false;

      return true;
    });

    const candidateSet = new Set(merged);
    const topLevel = merged.filter((node) => {
      let p = node.parentElement;
      while (p && p !== root) {
        if (candidateSet.has(p)) return false;
        if (hasBlockedCommerceClass(p)) return false;
        p = p.parentElement;
      }
      return true;
    });

    for (const node of topLevel) {
      const safe = sanitizeAmbientClone(node);
      if (safe) ambientRoot.appendChild(safe);
    }
    ambientRoot.insertAdjacentHTML("beforeend", buildAmbientRainHtml());

    return ambientRoot.outerHTML;
  } catch {
    return AMBIENT_EMPTY_HTML;
  }
}

function renderTextWithLinks(text: string): Array<string | JSX.Element> {
  return text.split(PR_URL_PATTERN).map((part, index) => {
    if (!/^https?:\/\/[^\s]+$/i.test(part)) return part;
    return (
      <a key={`msg-link-${index}`} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    );
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function createInvoiceHtml(item: ShopItem, seller: Profile): string {
  const invId = `INV-${Date.now()}`;
  return `<!DOCTYPE html>
<html>
<head><title>Invoice ${invId}</title>
<style>body{font-family:system-ui;max-width:500px;margin:2rem auto;padding:2rem;background:#111;color:#eee}
h1{font-size:1.5rem;margin-bottom:0.5rem}
.meta{color:#888;font-size:0.85rem;margin-bottom:1.5rem}
.item{background:#222;padding:1rem;border-radius:8px;margin:1rem 0}
.total{font-size:1.5rem;font-weight:700;margin-top:1rem;padding-top:1rem;border-top:1px solid #333}
</style></head>
<body>
<h1>Invoice ${invId}</h1>
<div class="meta">From: ${seller.displayName} (@${seller.username})<br>Date: ${new Date().toLocaleDateString()}</div>
<div class="item">
  <strong>${item.name}</strong><br>
  ${item.description}<br>
  <span class="total">$${item.price}</span>
</div>
<p style="color:#888;font-size:0.8rem;margin-top:2rem">Pay via Venmo or Cash App — links in DevSpace profile</p>
</body></html>`;
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [purchaseItem, setPurchaseItem] = useState<ShopItem | null>(null);
  const [me, setMe] = useState<Me>(null);

  // Codex editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [lastThemeChange, setLastThemeChange] = useState<ThemeChange | null>(null);
  const [prDraft, setPrDraft] = useState<PrDraft | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const vibeCanvasRef = useRef<HTMLDivElement>(null);
  const [ambientHtml, setAmbientHtml] = useState<string>(AMBIENT_EMPTY_HTML);
  const [vibeLayerStyle, setVibeLayerStyle] = useState<{ color?: string; fontFamily?: string }>({});

  const isOwnProfile = me && data && me.username === data.profile.username;

  useEffect(() => {
    fetch(`/api/profile/${username}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setMe({ username: d.user.username });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    const html = data?.profile.generatedHtml;
    const css = data?.profile.generatedCss;
    if (!html) {
      setAmbientHtml(AMBIENT_EMPTY_HTML);
      return;
    }
    setAmbientHtml(extractAmbientCanvasHtml(html, css ?? ""));
  }, [data?.profile.generatedHtml, data?.profile.generatedCss]);

  useEffect(() => {
    if (!data) {
      setVibeLayerStyle({});
      return;
    }

    const root = vibeCanvasRef.current?.querySelector(".vibe-profile");
    if (!(root instanceof HTMLElement)) return;

    const computed = window.getComputedStyle(root);
    setVibeLayerStyle({
      color: computed.color || undefined,
      fontFamily: computed.fontFamily || undefined,
    });
  }, [data?.profile.generatedCss, ambientHtml, data]);

  const refetchProfile = useCallback(() => {
    return fetch(`/api/profile/${username}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); });
  }, [username]);

  const sendVibecode = useCallback(async (prompt: string) => {
    if (!prompt.trim() || !data || generating) return;
    const userMsg: ChatMsg = { role: "user", text: prompt.trim(), ts: Date.now() };
    setChatHistory((h) => [...h, userMsg]);
    setChatInput("");
    setGenerating(true);

    const sysMsg = (text: string): ChatMsg => ({ role: "system", text, ts: Date.now() });
    setChatHistory((h) => [...h, sysMsg("Generating with Codex...")]);
    const beforeSnapshot: ThemeSnapshot = {
      prompt: data.profile.vibePrompt ?? "",
      html: data.profile.generatedHtml ?? "",
      css: data.profile.generatedCss ?? "",
    };

    try {
      const effectivePrompt = buildContextualPrompt(data.profile.vibePrompt ?? "", prompt);
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibePrompt: effectivePrompt,
          displayName: data.profile.displayName,
          bio: data.profile.bio,
          venmoUsername: data.profile.venmoUsername,
          cashAppUsername: data.profile.cashAppUsername,
          items: data.profile.items.map((i) => ({ id: i.id, name: i.name, price: i.price, description: i.description, imageUrl: i.imageUrl })),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const afterSnapshot: ThemeSnapshot = {
          prompt: effectivePrompt,
          html: typeof result.html === "string" ? result.html : beforeSnapshot.html,
          css: typeof result.css === "string" ? result.css : beforeSnapshot.css,
        };
        setLastThemeChange({ base: beforeSnapshot, head: afterSnapshot });
        setPrDraft(null);
        await refetchProfile();
        const reason =
          typeof result.providerReason === "string" && result.providerReason.trim()
            ? ` ${result.providerReason}`
            : "";
        setChatHistory((h) => [
          ...h.filter((m) => m.text !== "Generating with Codex..."),
          sysMsg(`Done! Theme applied via ${result.provider === "codex" ? "Codex" : "fallback"}.${reason}`),
        ]);
      } else {
        setChatHistory((h) => [
          ...h.filter((m) => m.text !== "Generating with Codex..."),
          sysMsg("Failed — are you logged in?"),
        ]);
      }
    } catch {
      setChatHistory((h) => [
        ...h.filter((m) => m.text !== "Generating with Codex..."),
        sysMsg("Network error. Try again."),
      ]);
    } finally {
      setGenerating(false);
    }
  }, [data, generating, refetchProfile]);

  const createProfilePr = useCallback(async () => {
    if (!lastThemeChange || creatingPr) return;
    setCreatingPr(true);
    const sysMsg = (text: string): ChatMsg => ({ role: "system", text, ts: Date.now() });
    setChatHistory((h) => [...h, sysMsg("Drafting PR with Codex...")]);

    try {
      const res = await fetch("/api/profile/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base: lastThemeChange.base,
          head: lastThemeChange.head,
          openOnGitHub: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setChatHistory((h) => [
          ...h.filter((m) => m.text !== "Drafting PR with Codex..."),
          sysMsg(result?.error ? `PR draft failed: ${result.error}` : "PR draft failed."),
        ]);
        return;
      }

      setPrDraft(result as PrDraft);
      const githubMsg =
        result?.github?.status === "created"
          ? ` GitHub PR: ${result.github.url}`
          : result?.github?.message
            ? ` ${result.github.message}`
            : "";
      setChatHistory((h) => [
        ...h.filter((m) => m.text !== "Drafting PR with Codex..."),
        sysMsg(`PR draft ready via ${result.provider === "codex" ? "Codex" : "fallback"}.${githubMsg}`),
      ]);
    } catch {
      setChatHistory((h) => [
        ...h.filter((m) => m.text !== "Drafting PR with Codex..."),
        sysMsg("PR draft failed due to network error."),
      ]);
    } finally {
      setCreatingPr(false);
    }
  }, [creatingPr, lastThemeChange]);

  if (loading) {
    return (
      <div className="profile-fullpage" style={{ display: "grid", placeContent: "center", background: "#0a0a0f" }}>
        <div style={{ textAlign: "center", color: "#666" }}>
          <div className="spin" style={{ width: 32, height: 32, border: "3px solid #333", borderTopColor: "#6366f1", borderRadius: "50%", margin: "0 auto 1rem" }} />
          Loading profile...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="profile-fullpage" style={{ display: "grid", placeContent: "center", background: "#0a0a0f" }}>
        <div style={{ textAlign: "center", color: "#999" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>404</p>
          <p>Profile not found</p>
          <button className="profile-back-btn" style={{ position: "static", marginTop: "1rem" }} onClick={() => router.push("/explore")}>
            &larr; Explore
          </button>
        </div>
      </div>
    );
  }

  const { profile, posts, friends } = data;
  const venmo = profile.venmoUsername ?? profile.username;
  const cashApp = profile.cashAppUsername ?? profile.username;

  const DEFAULT_TAB_ORDER: Tab[] = ["posts", "shop", "friends"];
  const customOrder = profile.layout?.tabOrder?.filter((t): t is Tab => DEFAULT_TAB_ORDER.includes(t as Tab));
  const tabOrder = customOrder?.length
    ? [...customOrder, ...DEFAULT_TAB_ORDER.filter((t) => !customOrder.includes(t))]
    : DEFAULT_TAB_ORDER;

  return (
    <div className="profile-immersive">
      <style dangerouslySetInnerHTML={{ __html: profile.generatedCss }} />
      {/* Full-viewport vibe background - their entire world */}
      <div ref={vibeCanvasRef} className="profile-vibe-canvas" dangerouslySetInnerHTML={{ __html: ambientHtml }} />
      {/* Content layer - inherits vibe colors/fonts, floats on top */}
      <div className="profile-vibe-layer" style={vibeLayerStyle}>
        <div className="profile-top-actions">
          <button className="profile-back-btn" onClick={() => router.back()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12L6 8l4-4" />
            </svg>
            Back
          </button>
          {isOwnProfile && (
            <button className="codex-editor-toggle" onClick={() => setEditorOpen(!editorOpen)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              {editorOpen ? "Close Editor" : "Codex Editor"}
            </button>
          )}
        </div>
        <header className="profile-header-vibe">
          <img src={profile.avatarUrl} alt="" className="profile-header-avatar" />
          <h1 className="profile-header-name">{profile.displayName}</h1>
          <p className="profile-header-handle">@{profile.username}</p>
          {profile.bio && <p className="profile-header-bio">{profile.bio}</p>}
        </header>
        <nav className="profile-tabs-inline">
          {tabOrder.map((tab) => (
            <button
              key={tab}
              className={`profile-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "posts" ? "Posts" : tab === "shop" ? "Shop" : "Friends"}
            </button>
          ))}
        </nav>
        <div className="profile-content-scroll">
        {activeTab === "posts" && (
          <section className="vp-posts-section">
            <h2 className="vp-section-title">Posts</h2>
            {posts.length === 0 ? (
              <p className="vp-muted">No posts yet.</p>
            ) : (
              <div className="vp-posts-list">
                {posts.map((post) => (
                  <article key={post.id} className="vp-post-card">
                    <div className="vp-post-header">
                      <img src={post.avatarUrl} alt="" className="vp-post-avatar" />
                      <div>
                        <span className="vp-post-author">{post.displayName}</span>
                        <span className="vp-post-handle">@{post.username}</span>
                      </div>
                      <span className="vp-post-time">{timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="vp-post-content">{post.content}</p>
                    {post.imageUrl && <img src={post.imageUrl} alt="" className="vp-post-image" />}
                    <div className="vp-post-meta">{post.likes.length} like{post.likes.length !== 1 ? "s" : ""}</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "shop" && (
          <section className="vp-shop-section">
            <h2 className="vp-section-title">{profile.displayName}&apos;s Shop</h2>
            {profile.items.length === 0 ? (
              <p className="vp-muted">No items for sale.</p>
            ) : (
              <div className="vp-shop-grid">
                {profile.items.map((item) => (
                  <div
                    key={item.id}
                    className="vp-item-card shop-item-clickable"
                    onClick={() => setPurchaseItem(item)}
                  >
                    <img src={item.imageUrl} alt={item.name} className="vp-item-image" />
                    <div className="vp-item-info">
                      <div className="vp-item-name">{item.name}</div>
                      <div className="vp-item-price">${item.price}</div>
                      <div className="vp-item-desc">{item.description}</div>
                      <span className="vp-item-buy">Buy now →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "friends" && (
          <section className="vp-friends-section">
            <h2 className="vp-section-title">Friends ({friends.length})</h2>
            {friends.length === 0 ? (
              <p className="vp-muted">No friends yet.</p>
            ) : (
              <div className="vp-friends-list">
                {friends.map((friend) => (
                  <a key={friend.username} href={`/profile/${friend.username}`} className="vp-friend-card">
                    <img src={friend.avatarUrl} alt="" className="vp-friend-avatar" />
                    <div>
                      <div className="vp-friend-name">{friend.displayName}</div>
                      <div className="vp-friend-handle">@{friend.username}</div>
                    </div>
                    <span className="vp-friend-bio">{friend.bio}</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
        </div>
      </div>

      {/* Purchase modal - inherits vibe when in profile */}
      {purchaseItem && (
        <div className="purchase-modal-overlay" onClick={() => setPurchaseItem(null)}>
          <div className="purchase-modal" style={vibeLayerStyle} onClick={(e) => e.stopPropagation()}>
            <h3>Buy {purchaseItem.name}</h3>
            <p className="purchase-seller">from {profile.displayName}</p>
            <p className="purchase-price">${purchaseItem.price}</p>
            <div className="purchase-actions">
              <a
                href={`https://account.venmo.com/pay?recipient=${venmo}&amount=${purchaseItem.price}`}
                target="_blank"
                rel="noopener noreferrer"
                className="purchase-btn purchase-venmo"
              >
                Pay with Venmo
              </a>
              <a
                href={`https://cash.app/$${cashApp}/${purchaseItem.price}`}
                target="_blank"
                rel="noopener noreferrer"
                className="purchase-btn purchase-cashapp"
              >
                Pay with Cash App
              </a>
              <button
                className="purchase-btn purchase-invoice"
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(createInvoiceHtml(purchaseItem, profile));
                    w.document.close();
                  }
                }}
              >
                Create Invoice
              </button>
            </div>
            <button className="purchase-cancel" onClick={() => setPurchaseItem(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Codex Editor Panel */}
      {editorOpen && isOwnProfile && (
        <div className="codex-panel">
          <div className="codex-panel-header">
            <div className="codex-panel-title">
              <div className="codex-logo-mark">C</div>
              <div>
                <div className="codex-title-main">Codex</div>
                <div className="codex-title-sub">AI Profile Editor</div>
              </div>
            </div>
            <button className="codex-panel-close" onClick={() => setEditorOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="codex-powered-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Powered by OpenAI Codex &mdash; describe anything, Codex rewrites your entire profile theme in seconds
          </div>

          <div className="codex-panel-chips">
            <div className="codex-chips-label">One-click transformations</div>
            <div className="codex-chips-grid">
              {DRASTIC_PROMPTS.map((dp) => (
                <button
                  key={dp.label}
                  className="codex-chip"
                  disabled={generating}
                  onClick={() => sendVibecode(dp.prompt)}
                >
                  {dp.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              <button
                className="codex-chip"
                type="button"
                disabled={!lastThemeChange || generating || creatingPr}
                onClick={createProfilePr}
              >
                {creatingPr ? "Creating PR..." : "Create PR for Last Change"}
              </button>
              {prDraft?.github?.status === "created" && prDraft.github.url && (
                <a className="codex-chip" href={prDraft.github.url} target="_blank" rel="noopener noreferrer">
                  Open PR
                </a>
              )}
              {prDraft && (
                <button
                  className="codex-chip"
                  type="button"
                  onClick={() => {
                    const markdown = [
                      `# ${prDraft.title}`,
                      "",
                      prDraft.body,
                      "",
                      "```diff",
                      prDraft.diff,
                      "```",
                    ].join("\n");
                    navigator.clipboard.writeText(markdown).catch(() => {});
                  }}
                >
                  Copy PR Markdown
                </button>
              )}
            </div>
            {prDraft && (
              <div style={{ marginTop: "0.75rem", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "0.65rem" }}>
                <div style={{ fontSize: "0.78rem", opacity: 0.8, marginBottom: "0.35rem" }}>
                  PR Draft via {prDraft.provider === "codex" ? "Codex" : "fallback"}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.35rem" }}>{prDraft.title}</div>
                <div style={{ fontSize: "0.8rem", whiteSpace: "pre-wrap", lineHeight: 1.4, maxHeight: 110, overflow: "auto", opacity: 0.9 }}>
                  {prDraft.body}
                </div>
                {prDraft.github && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", opacity: 0.9 }}>
                    {prDraft.github.status === "created" && prDraft.github.url ? (
                      <a href={prDraft.github.url} target="_blank" rel="noopener noreferrer">{prDraft.github.url}</a>
                    ) : (
                      prDraft.github.message
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="codex-panel-chat">
            {chatHistory.length === 0 && (
              <div className="codex-chat-empty">
                <div className="codex-chat-empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <strong>Ask Codex anything</strong><br />
                Describe a vibe, style, or aesthetic.<br />
                Codex will completely rewrite your HTML + CSS theme.
                <div className="codex-chat-empty-examples">
                  <span>&quot;90s GeoCities with star backgrounds&quot;</span>
                  <span>&quot;Make it look like a Bloomberg terminal&quot;</span>
                  <span>&quot;Cottagecore with handwritten fonts&quot;</span>
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`codex-chat-msg codex-chat-${msg.role}`}>
                <span className="codex-chat-role">{msg.role === "user" ? "You" : "Codex"}</span>
                <span className="codex-chat-text">{renderTextWithLinks(msg.text)}</span>
              </div>
            ))}
            {generating && (
              <div className="codex-chat-msg codex-chat-system codex-generating">
                <span className="codex-chat-role">Codex</span>
                <span className="codex-chat-text">
                  <span className="codex-dots"><span /><span /><span /></span>
                  Generating new theme...
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            className="codex-panel-input"
            onSubmit={(e) => { e.preventDefault(); sendVibecode(chatInput); }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tell Codex how to change your profile..."
              disabled={generating}
              autoFocus
            />
            <button type="submit" disabled={!chatInput.trim() || generating}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>

          <div className="codex-panel-footer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Changes are live &mdash; Codex generates pure HTML + CSS
          </div>
        </div>
      )}
    </div>
  );
}
