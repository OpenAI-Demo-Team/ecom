import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Role } from "../types/domain";

/* ─── persisted types ─── */

export type PersistedUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  githubToken?: string;
  role: Role;
  createdAt: string;
};

export type PersistedSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type Post = {
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

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
};

export type PersistedErrorLog = {
  id: string;
  area: "PROFILE_LOAD" | "API" | "AUTH" | "GENERAL";
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PersistedTimelineStep = {
  label: string;
  status: "done" | "pending";
  detail: string;
  at: string;
};

export type PersistedLoopRun = {
  id: string;
  status: "healthy" | "pending" | "fixed";
  latencyMs: number;
  codexProvider: "openai-codex" | "fallback";
  patchDiff: string;
  regressionTest: string;
  prTitle: string;
  reviewSummary: string;
  mergeSummary: string;
  jiraIssueUrl?: string;
  jiraBoardUrl?: string;
  githubPrUrl?: string;
  githubReviewCommentUrl?: string;
  cloudTaskId?: string;
  timeline: PersistedTimelineStep[];
  createdAt: string;
};

export type ProfileLayout = { tabOrder?: string[] };

export type DevSpaceProfile = {
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
  layout?: ProfileLayout;
  provider: "codex" | "fallback";
  items: Array<{
    id: string;
    name: string;
    price: number;
    description: string;
    imageUrl: string;
  }>;
  friends: string[];
  createdAt: string;
  updatedAt: string;
};

export type DevSpaceStore = {
  users: PersistedUser[];
  sessions: PersistedSession[];
  posts: Post[];
  comments: Comment[];
  errorLogs: PersistedErrorLog[];
  apiMetrics: {
    profileLoadAvgMs: number;
    profileLoadP95Ms: number;
    lastChecked: string;
  };
  latencyBugFixed: boolean;
  latencyIncidentOpen: boolean;
  latencyIncidentReportedAt: string | null;
  loopRuns: PersistedLoopRun[];
  profiles: DevSpaceProfile[];
};

/* ─── helpers ─── */

function nowISO(): string {
  return new Date().toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

const AVA = (u: string) => `https://i.pravatar.cc/150?u=${u}@devspace.demo`;
const IMG = (s: string) => `https://picsum.photos/seed/${s}/800/600`;
const PIMG = (s: string) => `https://picsum.photos/seed/${s}/400/300`;

/* ─── seed profiles ─── */

function seedProfiles(now: string): DevSpaceProfile[] {
  return [
    {
      userId: "u-jack",
      username: "jack",
      displayName: "Jack Chen",
      bio: "Full-stack hacker. I live in the terminal.",
      avatarUrl: AVA("jack"),
      vibePrompt: "cyberpunk hacker aesthetic, neon green on black, CRT scanlines, glitch effects",
      provider: "codex",
      items: [
        { id: "item-jack-1", name: "Terminal Bot", price: 29, description: "AI pair-programmer that lives in your shell", imageUrl: PIMG("terminal-bot") },
        { id: "item-jack-2", name: "Exploit Scanner", price: 49, description: "Static analysis agent for security audits", imageUrl: PIMG("exploit-scanner") },
        { id: "item-jack-3", name: "Night Owl Theme", price: 9, description: "Dark theme tuned for 3 AM coding sessions", imageUrl: PIMG("night-owl") },
      ],
      friends: ["u-luna", "u-rex", "u-nova", "u-zeph", "u-mira"],
      generatedHtml: `<div class="vibe-profile">
  <div class="crt-overlay"></div>
  <header class="vp-header">
    <h1 class="glitch" data-text="Jack Chen">Jack Chen</h1>
    <p class="bio">Full-stack hacker. I live in the terminal.</p>
    <div class="terminal-cursor">_</div>
  </header>
  <section class="vp-shop">
    <h2>&gt; shop --list</h2>
    <div class="items-grid">
      <div class="item-card"><div class="item-name">Terminal Bot</div><div class="item-price">$29</div><div class="item-desc">AI pair-programmer that lives in your shell</div></div>
      <div class="item-card"><div class="item-name">Exploit Scanner</div><div class="item-price">$49</div><div class="item-desc">Static analysis agent for security audits</div></div>
      <div class="item-card"><div class="item-name">Night Owl Theme</div><div class="item-price">$9</div><div class="item-desc">Dark theme tuned for 3 AM coding sessions</div></div>
    </div>
  </section>
  <footer class="vp-footer"><span>[ jack@devspace ~ ] $</span></footer>
</div>`,
      generatedCss: `.vibe-profile{position:relative;background:#000;color:#00ff41;font-family:'Courier New',monospace;padding:2rem;min-height:100%;cursor:crosshair;overflow:hidden}
.vibe-profile .crt-overlay{position:absolute;inset:0;pointer-events:none;z-index:2;background:repeating-linear-gradient(0deg,rgba(0,255,65,.03) 0px,rgba(0,255,65,.03) 1px,transparent 1px,transparent 3px)}
.vibe-profile .vp-header{text-align:center;padding:2rem 0;position:relative;z-index:1}
.vibe-profile .glitch{font-size:2.5rem;font-weight:700;text-shadow:0 0 10px #00ff41,0 0 40px #00ff41;animation:glitch-jitter .3s infinite}
@keyframes glitch-jitter{0%{transform:translate(0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1px,-2px)}80%{transform:translate(1px,2px)}100%{transform:translate(0)}}
.vibe-profile .bio{color:#00cc33;margin-top:.5rem;font-size:1rem}
.vibe-profile .terminal-cursor{display:inline-block;animation:blink 1s step-end infinite;font-size:1.5rem}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.vibe-profile .vp-shop{position:relative;z-index:1;padding:1rem 0}
.vibe-profile .vp-shop h2{font-size:1.2rem;color:#00ff41;margin-bottom:1rem}
.vibe-profile .items-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}
.vibe-profile .item-card{border:1px solid #00ff41;padding:1rem;background:rgba(0,255,65,.05);transition:box-shadow .2s}
.vibe-profile .item-card:hover{box-shadow:0 0 20px #00ff41}
.vibe-profile .item-name{font-weight:700;font-size:1.1rem}
.vibe-profile .item-price{color:#00ff41;font-size:1.3rem;margin:.3rem 0;text-shadow:0 0 6px #00ff41}
.vibe-profile .item-desc{color:#009926;font-size:.85rem}
.vibe-profile .vp-footer{position:relative;z-index:1;margin-top:2rem;padding-top:1rem;border-top:1px solid #00ff41;color:#00cc33;font-size:.9rem}`,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: "u-mira",
      username: "mira",
      displayName: "Mira Patel",
      bio: "Design engineer. Less is more.",
      avatarUrl: AVA("mira"),
      vibePrompt: "pink minimalist, soft gradients, elegant typography, floating shapes",
      provider: "codex",
      items: [
        { id: "item-mira-1", name: "Design System Kit", price: 39, description: "Tokens, components, and guidelines in one package", imageUrl: PIMG("design-kit") },
        { id: "item-mira-2", name: "Color Palette AI", price: 19, description: "Generate harmonious palettes from a single seed color", imageUrl: PIMG("color-palette") },
      ],
      friends: ["u-luna", "u-nova", "u-jack"],
      generatedHtml: `<div class="vibe-profile">
  <div class="floating-circle c1"></div>
  <div class="floating-circle c2"></div>
  <header class="vp-header">
    <h1>Mira Patel</h1>
    <p class="bio">Design engineer. Less is more.</p>
  </header>
  <section class="vp-shop">
    <h2>Shop</h2>
    <div class="items-grid">
      <div class="item-card"><div class="item-name">Design System Kit</div><div class="item-price">$39</div><div class="item-desc">Tokens, components, and guidelines in one package</div></div>
      <div class="item-card"><div class="item-name">Color Palette AI</div><div class="item-price">$19</div><div class="item-desc">Generate harmonious palettes from a single seed color</div></div>
    </div>
  </section>
  <footer class="vp-footer"><span>crafted with intention</span></footer>
</div>`,
      generatedCss: `.vibe-profile{position:relative;background:linear-gradient(135deg,#ffe4ec 0%,#fff0f5 100%);font-family:Georgia,'Times New Roman',serif;color:#4a2040;padding:3rem 2rem;min-height:100%;overflow:hidden}
.vibe-profile .floating-circle{position:absolute;border-radius:50%;opacity:.15;z-index:0}
.vibe-profile .c1{width:200px;height:200px;background:#ff8ec4;top:-40px;right:-40px;animation:float-up 8s ease-in-out infinite}
.vibe-profile .c2{width:140px;height:140px;background:#d4a5ff;bottom:30px;left:-30px;animation:float-up 6s ease-in-out infinite reverse}
@keyframes float-up{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
.vibe-profile .vp-header{position:relative;z-index:1;text-align:center;padding:2rem 0 1.5rem}
.vibe-profile .vp-header h1{font-size:2.4rem;font-weight:400;letter-spacing:.02em;color:#8b3a6b}
.vibe-profile .bio{color:#a0607e;margin-top:.5rem;font-size:1.05rem;font-style:italic}
.vibe-profile .vp-shop{position:relative;z-index:1;padding:1rem 0}
.vibe-profile .vp-shop h2{font-size:1.3rem;color:#8b3a6b;margin-bottom:1.2rem;text-align:center;font-weight:400}
.vibe-profile .items-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem}
.vibe-profile .item-card{background:rgba(255,255,255,.7);border-radius:16px;padding:1.5rem;transition:transform .3s,box-shadow .3s;backdrop-filter:blur(4px)}
.vibe-profile .item-card:hover{transform:translateY(-6px);box-shadow:0 12px 32px rgba(139,58,107,.15)}
.vibe-profile .item-name{font-size:1.1rem;color:#6b2a52}
.vibe-profile .item-price{font-size:1.4rem;color:#d4608a;margin:.4rem 0}
.vibe-profile .item-desc{font-size:.9rem;color:#a0607e}
.vibe-profile .vp-footer{position:relative;z-index:1;text-align:center;margin-top:2.5rem;padding-top:1rem;border-top:1px solid rgba(139,58,107,.15);color:#c490aa;font-size:.85rem}`,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: "u-zeph",
      username: "zeph",
      displayName: "Zeph Torres",
      bio: "Aesthetic archivist. Retro futures & synthwave dreams.",
      avatarUrl: AVA("zeph"),
      vibePrompt: "vaporwave retro, pink-purple gradient, perspective grid, chrome text, sunset stripes",
      provider: "codex",
      items: [
        { id: "item-zeph-1", name: "Synthwave Playlist Bot", price: 15, description: "Curates the ultimate coding playlist", imageUrl: PIMG("synthwave-bot") },
        { id: "item-zeph-2", name: "Retro Avatar Maker", price: 25, description: "Pixel-perfect avatars with 80s flair", imageUrl: PIMG("retro-avatar") },
        { id: "item-zeph-3", name: "Lo-Fi Stream Agent", price: 35, description: "AI DJ for your live coding streams", imageUrl: PIMG("lofi-agent") },
      ],
      friends: ["u-jack", "u-rex", "u-luna"],
      generatedHtml: `<div class="vibe-profile">
  <div class="grid-floor"></div>
  <div class="sunset-stripes"></div>
  <header class="vp-header">
    <h1 class="chrome-text">Zeph Torres</h1>
    <p class="bio">Aesthetic archivist. Retro futures &amp; synthwave dreams.</p>
  </header>
  <section class="vp-shop">
    <h2>/ / S H O P / /</h2>
    <div class="items-grid">
      <div class="item-card"><div class="item-name">Synthwave Playlist Bot</div><div class="item-price">$15</div><div class="item-desc">Curates the ultimate coding playlist</div></div>
      <div class="item-card"><div class="item-name">Retro Avatar Maker</div><div class="item-price">$25</div><div class="item-desc">Pixel-perfect avatars with 80s flair</div></div>
      <div class="item-card"><div class="item-name">Lo-Fi Stream Agent</div><div class="item-price">$35</div><div class="item-desc">AI DJ for your live coding streams</div></div>
    </div>
  </section>
  <footer class="vp-footer"><span>~ v a p o r w a v e ~</span></footer>
</div>`,
      generatedCss: `.vibe-profile{position:relative;background:linear-gradient(180deg,#ff71ce 0%,#b967ff 40%,#7b2ff7 100%);font-family:Impact,'Arial Black',sans-serif;color:#fff;padding:2rem;min-height:100%;overflow:hidden}
.vibe-profile .grid-floor{position:absolute;bottom:0;left:0;right:0;height:40%;z-index:0;background:linear-gradient(transparent 0%,rgba(123,47,247,.3) 100%),repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0px,rgba(255,255,255,.07) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0px,rgba(255,255,255,.07) 1px,transparent 1px,transparent 60px);transform:perspective(400px) rotateX(45deg);transform-origin:bottom}
.vibe-profile .sunset-stripes{position:absolute;top:30%;left:0;right:0;height:60px;z-index:0;opacity:.25;background:repeating-linear-gradient(0deg,#ff6b6b 0px,#ff6b6b 4px,transparent 4px,transparent 10px)}
.vibe-profile .vp-header{position:relative;z-index:1;text-align:center;padding:2rem 0}
.vibe-profile .chrome-text{font-size:3rem;background:linear-gradient(180deg,#fff 0%,#ff71ce 40%,#b967ff 80%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-transform:uppercase;letter-spacing:.1em}
.vibe-profile .bio{color:rgba(255,255,255,.8);font-family:Arial,sans-serif;font-weight:400;font-size:1rem;margin-top:.5rem}
.vibe-profile .vp-shop{position:relative;z-index:1;padding:1rem 0}
.vibe-profile .vp-shop h2{text-align:center;font-size:1.2rem;letter-spacing:.3em;margin-bottom:1rem;color:rgba(255,255,255,.9)}
.vibe-profile .items-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}
.vibe-profile .item-card{background:rgba(255,255,255,.1);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:1.2rem;transition:transform .2s}
.vibe-profile .item-card:hover{transform:scale(1.04)}
.vibe-profile .item-name{font-size:1.1rem;text-transform:uppercase;letter-spacing:.05em}
.vibe-profile .item-price{font-size:1.4rem;color:#ffde59;margin:.3rem 0}
.vibe-profile .item-desc{font-family:Arial,sans-serif;font-weight:400;font-size:.85rem;color:rgba(255,255,255,.7)}
.vibe-profile .vp-footer{position:relative;z-index:1;text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,.15);font-family:Arial,sans-serif;font-size:.9rem;letter-spacing:.4em;color:rgba(255,255,255,.6)}`,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: "u-luna",
      username: "luna",
      displayName: "Luna Kim",
      bio: "Data scientist exploring the deep. Bioluminescent code.",
      avatarUrl: AVA("luna"),
      vibePrompt: "deep sea bioluminescent, dark navy, glowing teal accents, floating bubbles, wavy text",
      provider: "codex",
      items: [
        { id: "item-luna-1", name: "Deep Learning Agent", price: 59, description: "Neural network training assistant with real-time insights", imageUrl: PIMG("deep-learning") },
        { id: "item-luna-2", name: "Ocean Data Viz", price: 29, description: "Beautiful data visualizations inspired by the deep sea", imageUrl: PIMG("ocean-viz") },
      ],
      friends: ["u-mira", "u-jack", "u-zeph"],
      generatedHtml: `<div class="vibe-profile">
  <div class="bubble b1"></div><div class="bubble b2"></div><div class="bubble b3"></div><div class="bubble b4"></div><div class="bubble b5"></div>
  <header class="vp-header">
    <h1 class="wavy-text">Luna Kim</h1>
    <p class="bio">Data scientist exploring the deep. Bioluminescent code.</p>
  </header>
  <section class="vp-shop">
    <h2>~ artifacts ~</h2>
    <div class="items-grid">
      <div class="item-card"><div class="item-name">Deep Learning Agent</div><div class="item-price">$59</div><div class="item-desc">Neural network training assistant with real-time insights</div></div>
      <div class="item-card"><div class="item-name">Ocean Data Viz</div><div class="item-price">$29</div><div class="item-desc">Beautiful data visualizations inspired by the deep sea</div></div>
    </div>
  </section>
  <footer class="vp-footer"><span>surfacing from the depths</span></footer>
</div>`,
      generatedCss: `.vibe-profile{position:relative;background:#0a1628;color:#c8f7f0;font-family:'Segoe UI',Tahoma,sans-serif;padding:2.5rem 2rem;min-height:100%;overflow:hidden}
.vibe-profile .bubble{position:absolute;border-radius:50%;background:rgba(0,255,213,.08);border:1px solid rgba(0,255,213,.15);z-index:0}
.vibe-profile .b1{width:20px;height:20px;bottom:-20px;left:15%;animation:rise 7s linear infinite}
.vibe-profile .b2{width:12px;height:12px;bottom:-12px;left:45%;animation:rise 5s linear infinite 1s}
.vibe-profile .b3{width:16px;height:16px;bottom:-16px;left:70%;animation:rise 9s linear infinite 2s}
.vibe-profile .b4{width:10px;height:10px;bottom:-10px;left:30%;animation:rise 6s linear infinite 3s}
.vibe-profile .b5{width:14px;height:14px;bottom:-14px;left:80%;animation:rise 8s linear infinite .5s}
@keyframes rise{0%{transform:translateY(0);opacity:.8}100%{transform:translateY(-600px);opacity:0}}
.vibe-profile .vp-header{position:relative;z-index:1;text-align:center;padding:2rem 0}
.vibe-profile .wavy-text{font-size:2.5rem;font-weight:300;color:#00ffd5;text-shadow:0 0 20px rgba(0,255,213,.6),0 0 60px rgba(0,255,213,.3);animation:wavy 3s ease-in-out infinite}
@keyframes wavy{0%,100%{letter-spacing:.02em}50%{letter-spacing:.12em}}
.vibe-profile .bio{color:#7eb8ad;margin-top:.5rem;font-size:1rem}
.vibe-profile .vp-shop{position:relative;z-index:1;padding:1rem 0}
.vibe-profile .vp-shop h2{text-align:center;color:#00ffd5;font-weight:300;font-size:1.2rem;margin-bottom:1.2rem}
.vibe-profile .items-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem}
.vibe-profile .item-card{background:rgba(0,255,213,.05);border:1px solid rgba(0,255,213,.15);border-radius:12px;padding:1.3rem;backdrop-filter:blur(4px);transition:box-shadow .3s}
.vibe-profile .item-card:hover{box-shadow:0 0 30px rgba(0,255,213,.2)}
.vibe-profile .item-name{font-size:1.1rem;color:#00ffd5}
.vibe-profile .item-price{font-size:1.4rem;color:#5ef5d5;margin:.3rem 0;text-shadow:0 0 8px rgba(0,255,213,.4)}
.vibe-profile .item-desc{font-size:.85rem;color:#7eb8ad}
.vibe-profile .vp-footer{position:relative;z-index:1;text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(0,255,213,.1);color:#4a8a7e;font-size:.85rem}`,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: "u-rex",
      username: "rex",
      displayName: "Rex Morrison",
      bio: "ENGINEER. NO FLUFF. SHIP OR DIE.",
      avatarUrl: AVA("rex"),
      vibePrompt: "brutalist raw, white and black, thick borders, all caps, monospace, dense grid",
      provider: "codex",
      items: [
        { id: "item-rex-1", name: "CLI Power Tools", price: 19, description: "50 shell scripts that actually work", imageUrl: PIMG("cli-tools") },
        { id: "item-rex-2", name: "Markdown Enforcer", price: 9, description: "Lint your docs like you lint your code", imageUrl: PIMG("markdown-lint") },
        { id: "item-rex-3", name: "No-BS Linter", price: 29, description: "Zero config. Zero mercy. Just clean code.", imageUrl: PIMG("nobs-linter") },
      ],
      friends: ["u-jack", "u-zeph"],
      generatedHtml: `<div class="vibe-profile">
  <header class="vp-header">
    <h1>REX MORRISON</h1>
    <div class="dotted-sep"></div>
    <p class="bio">ENGINEER. NO FLUFF. SHIP OR DIE.</p>
  </header>
  <div class="dotted-sep"></div>
  <section class="vp-shop">
    <h2>PRODUCTS</h2>
    <div class="items-grid">
      <div class="item-card"><div class="item-name">CLI POWER TOOLS</div><div class="item-price">$19</div><div class="item-desc">50 SHELL SCRIPTS THAT ACTUALLY WORK</div></div>
      <div class="item-card"><div class="item-name">MARKDOWN ENFORCER</div><div class="item-price">$9</div><div class="item-desc">LINT YOUR DOCS LIKE YOU LINT YOUR CODE</div></div>
      <div class="item-card"><div class="item-name">NO-BS LINTER</div><div class="item-price">$29</div><div class="item-desc">ZERO CONFIG. ZERO MERCY. JUST CLEAN CODE.</div></div>
    </div>
  </section>
  <div class="dotted-sep"></div>
  <footer class="vp-footer"><span>BUILT DIFFERENT.</span></footer>
</div>`,
      generatedCss: `.vibe-profile{background:#fff;color:#000;font-family:'Courier New',monospace;padding:2rem;min-height:100%;text-transform:uppercase}
.vibe-profile .dotted-sep{border-bottom:3px dotted #000;margin:1rem 0}
.vibe-profile .vp-header{padding:1rem 0}
.vibe-profile .vp-header h1{font-size:2.8rem;font-weight:900;letter-spacing:.05em;line-height:1;border-bottom:3px solid #000;display:inline-block;padding-bottom:.3rem}
.vibe-profile .bio{font-size:1rem;font-weight:700;margin-top:.5rem;letter-spacing:.08em}
.vibe-profile .vp-shop{padding:1rem 0}
.vibe-profile .vp-shop h2{font-size:1.2rem;font-weight:900;letter-spacing:.15em;border:3px solid #000;display:inline-block;padding:.3rem .8rem;margin-bottom:1rem}
.vibe-profile .items-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0}
.vibe-profile .item-card{border:3px solid #000;padding:1.2rem;border-radius:0;transition:background .15s}
.vibe-profile .item-card:hover{background:#000;color:#fff}
.vibe-profile .item-name{font-size:1rem;font-weight:900}
.vibe-profile .item-price{font-size:1.6rem;font-weight:900;margin:.3rem 0}
.vibe-profile .item-desc{font-size:.8rem;font-weight:700;letter-spacing:.03em}
.vibe-profile .vp-footer{padding-top:1rem;font-size:.9rem;font-weight:900;letter-spacing:.12em}`,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: "u-nova",
      username: "nova",
      displayName: "Nova Osei",
      bio: "Building tools for stargazers. Code is cosmic.",
      avatarUrl: AVA("nova"),
      vibePrompt: "cosmic space, deep purple-black, starfield, galaxy gradient text, nebula glow, floating particles",
      provider: "codex",
      items: [
        { id: "item-nova-1", name: "Starmap API", price: 45, description: "Query any star, constellation, or celestial event", imageUrl: PIMG("starmap-api") },
        { id: "item-nova-2", name: "Nebula Theme Pack", price: 12, description: "IDE themes inspired by Hubble photography", imageUrl: PIMG("nebula-theme") },
      ],
      friends: ["u-mira", "u-luna", "u-jack"],
      generatedHtml: `<div class="vibe-profile">
  <div class="starfield"></div>
  <div class="particle p1"></div><div class="particle p2"></div><div class="particle p3"></div>
  <div class="particle p4"></div><div class="particle p5"></div><div class="particle p6"></div>
  <header class="vp-header">
    <h1 class="galaxy-text">Nova Osei</h1>
    <p class="bio">Building tools for stargazers. Code is cosmic.</p>
  </header>
  <section class="vp-shop">
    <h2>celestial wares</h2>
    <div class="items-grid">
      <div class="item-card"><div class="item-name">Starmap API</div><div class="item-price">$45</div><div class="item-desc">Query any star, constellation, or celestial event</div></div>
      <div class="item-card"><div class="item-name">Nebula Theme Pack</div><div class="item-price">$12</div><div class="item-desc">IDE themes inspired by Hubble photography</div></div>
    </div>
  </section>
  <footer class="vp-footer"><span>ad astra per aspera</span></footer>
</div>`,
      generatedCss: `.vibe-profile{position:relative;background:#0b0015;color:#e0d0ff;font-family:'Segoe UI',Tahoma,sans-serif;padding:2.5rem 2rem;min-height:100%;overflow:hidden}
.vibe-profile .starfield{position:absolute;inset:0;z-index:0;background:radial-gradient(1px 1px at 20% 30%,#fff 100%,transparent),radial-gradient(1px 1px at 40% 70%,#fff 100%,transparent),radial-gradient(1px 1px at 60% 20%,rgba(255,255,255,.7) 100%,transparent),radial-gradient(1px 1px at 80% 50%,#fff 100%,transparent),radial-gradient(1.5px 1.5px at 10% 80%,rgba(200,180,255,.8) 100%,transparent),radial-gradient(1px 1px at 90% 10%,#fff 100%,transparent),radial-gradient(1.5px 1.5px at 50% 50%,rgba(200,180,255,.6) 100%,transparent),radial-gradient(1px 1px at 70% 90%,#fff 100%,transparent)}
.vibe-profile .particle{position:absolute;border-radius:50%;z-index:0;opacity:.5}
.vibe-profile .p1{width:4px;height:4px;background:#c7a0ff;top:20%;left:25%;animation:drift 10s ease-in-out infinite}
.vibe-profile .p2{width:3px;height:3px;background:#ff80bf;top:60%;left:75%;animation:drift 8s ease-in-out infinite 1s}
.vibe-profile .p3{width:5px;height:5px;background:#80b0ff;top:40%;left:50%;animation:drift 12s ease-in-out infinite 2s}
.vibe-profile .p4{width:3px;height:3px;background:#c7a0ff;top:80%;left:15%;animation:drift 9s ease-in-out infinite .5s}
.vibe-profile .p5{width:4px;height:4px;background:#ff80bf;top:10%;left:85%;animation:drift 11s ease-in-out infinite 3s}
.vibe-profile .p6{width:3px;height:3px;background:#80b0ff;top:70%;left:40%;animation:drift 7s ease-in-out infinite 1.5s}
@keyframes drift{0%,100%{transform:translate(0,0)}25%{transform:translate(10px,-15px)}50%{transform:translate(-8px,10px)}75%{transform:translate(12px,5px)}}
.vibe-profile .vp-header{position:relative;z-index:1;text-align:center;padding:2rem 0}
.vibe-profile .galaxy-text{font-size:2.8rem;font-weight:300;background:linear-gradient(135deg,#c7a0ff,#ff80bf,#80b0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.vibe-profile .bio{color:#9a80c0;margin-top:.5rem;font-size:1rem}
.vibe-profile .vp-shop{position:relative;z-index:1;padding:1rem 0}
.vibe-profile .vp-shop h2{text-align:center;color:#c7a0ff;font-weight:300;font-size:1.2rem;letter-spacing:.2em;margin-bottom:1.2rem}
.vibe-profile .items-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem}
.vibe-profile .item-card{background:rgba(200,160,255,.06);border:1px solid rgba(200,160,255,.15);border-radius:12px;padding:1.3rem;transition:box-shadow .3s;box-shadow:0 0 15px rgba(200,160,255,.05)}
.vibe-profile .item-card:hover{box-shadow:0 0 40px rgba(200,160,255,.2),0 0 80px rgba(255,128,191,.1)}
.vibe-profile .item-name{font-size:1.1rem;color:#e0c0ff}
.vibe-profile .item-price{font-size:1.4rem;color:#ff80bf;margin:.3rem 0;text-shadow:0 0 12px rgba(255,128,191,.4)}
.vibe-profile .item-desc{font-size:.85rem;color:#9a80c0}
.vibe-profile .vp-footer{position:relative;z-index:1;text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(200,160,255,.1);color:#6a50a0;font-size:.85rem;font-style:italic;letter-spacing:.15em}`,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/* ─── seed posts ─── */

function seedPosts(): Post[] {
  return [
    { id: "p-1", userId: "u-jack", username: "jack", displayName: "Jack Chen", avatarUrl: AVA("jack"), content: "Just deployed my terminal bot to 500 users overnight. The feedback loop is insane \u2014 already pushed 3 patches based on user suggestions.", imageUrl: IMG("terminal-deploy"), likes: ["u-luna", "u-mira", "u-nova", "u-zeph"], createdAt: hoursAgo(336) },
    { id: "p-2", userId: "u-mira", username: "mira", displayName: "Mira Patel", avatarUrl: AVA("mira"), content: "New design system update: unified token structure across light and dark modes. It\u2019s the small things that make the big difference.", imageUrl: IMG("design-tokens"), likes: ["u-jack", "u-luna", "u-nova"], createdAt: hoursAgo(312) },
    { id: "p-3", userId: "u-zeph", username: "zeph", displayName: "Zeph Torres", avatarUrl: AVA("zeph"), content: "Lo-fi beats + coding = productivity x10. Been building the playlist curation algorithm all week. The vibes are immaculate.", imageUrl: null, likes: ["u-jack", "u-luna"], createdAt: hoursAgo(288) },
    { id: "p-4", userId: "u-luna", username: "luna", displayName: "Luna Kim", avatarUrl: AVA("luna"), content: "Training a new neural network on deep ocean temperature data. The emergent patterns look like art. Nature is the OG generative artist.", imageUrl: IMG("ocean-neural"), likes: ["u-nova", "u-mira", "u-jack", "u-zeph"], createdAt: hoursAgo(264) },
    { id: "p-5", userId: "u-rex", username: "rex", displayName: "Rex Morrison", avatarUrl: AVA("rex"), content: "SHIPPED 3 FEATURES TODAY. NO MEETINGS. THE DREAM.", imageUrl: null, likes: ["u-jack", "u-zeph", "u-nova"], createdAt: hoursAgo(240) },
    { id: "p-6", userId: "u-nova", username: "nova", displayName: "Nova Osei", avatarUrl: AVA("nova"), content: "Nebula Theme Pack v2 is live! 12 new galaxy-inspired color schemes for VS Code and JetBrains. Link in my shop.", imageUrl: IMG("nebula-pack"), likes: ["u-mira", "u-luna", "u-jack", "u-zeph", "u-rex"], createdAt: hoursAgo(216) },
    { id: "p-7", userId: "u-jack", username: "jack", displayName: "Jack Chen", avatarUrl: AVA("jack"), content: "PSA: if your API response time is over 200ms, you have a bug, not a feature. Optimize or go home.", imageUrl: null, likes: ["u-rex", "u-luna"], createdAt: hoursAgo(192) },
    { id: "p-8", userId: "u-mira", username: "mira", displayName: "Mira Patel", avatarUrl: AVA("mira"), content: "Minimalism isn\u2019t about removing things. It\u2019s about keeping only what matters. Same goes for code.", imageUrl: null, likes: ["u-luna", "u-nova", "u-zeph"], createdAt: hoursAgo(168) },
    { id: "p-9", userId: "u-luna", username: "luna", displayName: "Luna Kim", avatarUrl: AVA("luna"), content: "Pro tip: always visualize your loss curves. You\u2019d be amazed how many bugs hide in plain sight.", imageUrl: IMG("loss-curves"), likes: ["u-nova", "u-jack"], createdAt: hoursAgo(144) },
    { id: "p-10", userId: "u-zeph", username: "zeph", displayName: "Zeph Torres", avatarUrl: AVA("zeph"), content: "Anyone else code better at 2am with synthwave playing? The Retro Avatar Maker was entirely built between midnight and dawn.", imageUrl: null, likes: ["u-jack", "u-rex"], createdAt: hoursAgo(120) },
    { id: "p-11", userId: "u-rex", username: "rex", displayName: "Rex Morrison", avatarUrl: AVA("rex"), content: "UNPOPULAR OPINION: MOST DESIGN SYSTEMS ARE OVER-ENGINEERED. GIVE ME A GOOD RESET AND 10 UTILITY CLASSES.", imageUrl: null, likes: ["u-jack", "u-zeph"], createdAt: hoursAgo(96) },
    { id: "p-12", userId: "u-nova", username: "nova", displayName: "Nova Osei", avatarUrl: AVA("nova"), content: "Just mapped 10,000 stars visible from the southern hemisphere into the Starmap API. v3 drops next week.", imageUrl: IMG("starmap-v3"), likes: ["u-luna", "u-mira", "u-jack"], createdAt: hoursAgo(72) },
    { id: "p-13", userId: "u-jack", username: "jack", displayName: "Jack Chen", avatarUrl: AVA("jack"), content: "My terminal bot auto-fixed a production bug at 3am while I was sleeping. Woke up to a merged PR. This is the future.", imageUrl: IMG("auto-fix-pr"), likes: ["u-luna", "u-nova", "u-rex", "u-mira", "u-zeph"], createdAt: hoursAgo(48) },
    { id: "p-14", userId: "u-mira", username: "mira", displayName: "Mira Patel", avatarUrl: AVA("mira"), content: "Soft gradients > hard edges. Every time. Gentle transitions just feel more natural to the human eye.", imageUrl: null, likes: ["u-luna", "u-zeph"], createdAt: hoursAgo(36) },
    { id: "p-15", userId: "u-zeph", username: "zeph", displayName: "Zeph Torres", avatarUrl: AVA("zeph"), content: "Retro Avatar Maker just hit 1,000 downloads! The 80s are officially back, baby.", imageUrl: IMG("retro-1k"), likes: ["u-rex", "u-jack", "u-nova", "u-luna"], createdAt: hoursAgo(30) },
    { id: "p-16", userId: "u-luna", username: "luna", displayName: "Luna Kim", avatarUrl: AVA("luna"), content: "What happens when you train a neural net on coral reef imagery? Pure generative art. I could stare at these outputs all day.", imageUrl: IMG("coral-gen"), likes: ["u-zeph", "u-mira", "u-nova"], createdAt: hoursAgo(24) },
    { id: "p-17", userId: "u-rex", username: "rex", displayName: "Rex Morrison", avatarUrl: AVA("rex"), content: "CODE REVIEW CHECKLIST: 1) DOES IT WORK? 2) IS IT SIMPLE? 3) WOULD I UNDERSTAND THIS AT 3AM? THAT\u2019S IT.", imageUrl: null, likes: ["u-jack", "u-nova", "u-luna"], createdAt: hoursAgo(18) },
    { id: "p-18", userId: "u-nova", username: "nova", displayName: "Nova Osei", avatarUrl: AVA("nova"), content: "The cosmos teaches us a lot about distributed systems. Eventual consistency is literally how galaxies form.", imageUrl: null, likes: ["u-jack", "u-luna"], createdAt: hoursAgo(12) },
    { id: "p-19", userId: "u-jack", username: "jack", displayName: "Jack Chen", avatarUrl: AVA("jack"), content: "Hot take: console.log is the most powerful debugging tool ever invented and I will die on this hill.", imageUrl: null, likes: ["u-rex", "u-zeph", "u-luna", "u-nova"], createdAt: hoursAgo(6) },
    { id: "p-20", userId: "u-mira", username: "mira", displayName: "Mira Patel", avatarUrl: AVA("mira"), content: "Launched Color Palette AI today! Give it one seed color and it generates a full harmonious palette. Link in shop.", imageUrl: IMG("palette-launch"), likes: ["u-luna", "u-jack", "u-nova", "u-zeph", "u-rex"], createdAt: hoursAgo(2) },
  ];
}

/* ─── seed comments ─── */

function seedComments(): Comment[] {
  return [
    { id: "c-1", postId: "p-1", userId: "u-luna", username: "luna", displayName: "Luna Kim", content: "500 users already? That\u2019s incredible growth!", createdAt: hoursAgo(330) },
    { id: "c-2", postId: "p-1", userId: "u-mira", username: "mira", displayName: "Mira Patel", content: "Love how clean the terminal UI looks. The green-on-black is chef\u2019s kiss.", createdAt: hoursAgo(328) },
    { id: "c-3", postId: "p-2", userId: "u-jack", username: "jack", displayName: "Jack Chen", content: "Been waiting for this update. The dark mode tokens are perfect.", createdAt: hoursAgo(310) },
    { id: "c-4", postId: "p-4", userId: "u-nova", username: "nova", displayName: "Nova Osei", content: "The intersection of data science and art is where the magic happens.", createdAt: hoursAgo(260) },
    { id: "c-5", postId: "p-5", userId: "u-jack", username: "jack", displayName: "Jack Chen", content: "This is the way.", createdAt: hoursAgo(238) },
    { id: "c-6", postId: "p-5", userId: "u-zeph", username: "zeph", displayName: "Zeph Torres", content: "Legend status achieved.", createdAt: hoursAgo(236) },
    { id: "c-7", postId: "p-6", userId: "u-mira", username: "mira", displayName: "Mira Patel", content: "Those color schemes are stunning. Galaxy Dusk is my new daily driver.", createdAt: hoursAgo(214) },
    { id: "c-8", postId: "p-7", userId: "u-rex", username: "rex", displayName: "Rex Morrison", content: "LOUDER FOR THE PEOPLE IN THE BACK.", createdAt: hoursAgo(190) },
    { id: "c-9", postId: "p-9", userId: "u-nova", username: "nova", displayName: "Nova Osei", content: "This saved me 2 days of debugging last month. Underrated advice.", createdAt: hoursAgo(142) },
    { id: "c-10", postId: "p-11", userId: "u-mira", username: "mira", displayName: "Mira Patel", content: "I respectfully disagree but I admire the confidence.", createdAt: hoursAgo(94) },
    { id: "c-11", postId: "p-13", userId: "u-luna", username: "luna", displayName: "Luna Kim", content: "This is genuinely the future of DevOps. Autonomous patching while you sleep.", createdAt: hoursAgo(46) },
    { id: "c-12", postId: "p-15", userId: "u-rex", username: "rex", displayName: "Rex Morrison", content: "DOWNLOADED. USING IT. NO REGRETS.", createdAt: hoursAgo(28) },
    { id: "c-13", postId: "p-16", userId: "u-zeph", username: "zeph", displayName: "Zeph Torres", content: "This is giving major vaporwave vibes and I am absolutely here for it.", createdAt: hoursAgo(22) },
    { id: "c-14", postId: "p-18", userId: "u-jack", username: "jack", displayName: "Jack Chen", content: "Never thought I\u2019d learn distributed systems from astronomy but here we are.", createdAt: hoursAgo(10) },
    { id: "c-15", postId: "p-20", userId: "u-luna", username: "luna", displayName: "Luna Kim", content: "Just tried it. Generated a perfect oceanic palette in seconds. Incredible work.", createdAt: hoursAgo(1) },
  ];
}

/* ─── default store ─── */

function defaultStore(): DevSpaceStore {
  const now = nowISO();
  return {
    users: [
      { id: "u-admin", email: "admin@devspace.demo", password: "admin123", name: "DevSpace Admin", role: "ADMIN", createdAt: now },
      { id: "u-jack", email: "jack@devspace.demo", password: "demo123", name: "Jack Chen", role: "CUSTOMER", createdAt: now },
      { id: "u-mira", email: "mira@devspace.demo", password: "demo123", name: "Mira Patel", role: "CUSTOMER", createdAt: now },
      { id: "u-zeph", email: "zeph@devspace.demo", password: "demo123", name: "Zeph Torres", role: "CUSTOMER", createdAt: now },
      { id: "u-luna", email: "luna@devspace.demo", password: "demo123", name: "Luna Kim", role: "CUSTOMER", createdAt: now },
      { id: "u-rex", email: "rex@devspace.demo", password: "demo123", name: "Rex Morrison", role: "CUSTOMER", createdAt: now },
      { id: "u-nova", email: "nova@devspace.demo", password: "demo123", name: "Nova Osei", role: "CUSTOMER", createdAt: now },
    ],
    sessions: [],
    posts: seedPosts(),
    comments: seedComments(),
    errorLogs: [],
    apiMetrics: { profileLoadAvgMs: 760, profileLoadP95Ms: 980, lastChecked: now },
    latencyBugFixed: false,
    latencyIncidentOpen: false,
    latencyIncidentReportedAt: null,
    loopRuns: [],
    profiles: seedProfiles(now),
  };
}

/* ─── store path ─── */

export function getStorePath(): string {
  return (
    process.env.DEVSPACE_STORE_PATH ??
    process.env.STORE_PATH ??
    path.join(process.cwd(), "output", "devspace-store.json")
  );
}

/* ─── store operations ─── */

export async function ensureStoreExists(): Promise<void> {
  const storePath = getStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  try {
    await readFile(storePath, "utf-8");
  } catch {
    await writeFile(storePath, JSON.stringify(defaultStore(), null, 2), "utf-8");
  }
}

export async function readStore(): Promise<DevSpaceStore> {
  await ensureStoreExists();
  const raw = await readFile(getStorePath(), "utf-8");
  const parsed = JSON.parse(raw) as DevSpaceStore;

  parsed.sessions = parsed.sessions ?? [];
  parsed.posts = parsed.posts ?? [];
  parsed.comments = parsed.comments ?? [];
  parsed.errorLogs = parsed.errorLogs ?? [];
  parsed.loopRuns = parsed.loopRuns ?? [];
  parsed.profiles = parsed.profiles ?? [];
  parsed.apiMetrics = parsed.apiMetrics ?? { profileLoadAvgMs: 760, profileLoadP95Ms: 980, lastChecked: nowISO() };
  if (typeof parsed.latencyBugFixed !== "boolean") parsed.latencyBugFixed = false;
  if (typeof parsed.latencyIncidentOpen !== "boolean") parsed.latencyIncidentOpen = false;
  if (typeof parsed.latencyIncidentReportedAt !== "string") parsed.latencyIncidentReportedAt = null;

  return parsed;
}

export async function writeStore(store: DevSpaceStore): Promise<void> {
  await ensureStoreExists();
  await writeFile(getStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

let writeQueue: Promise<unknown> = Promise.resolve();

export async function updateStore<T>(updater: (store: DevSpaceStore) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const store = await readStore();
    const result = await updater(store);
    await writeStore(store);
    return result;
  });
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function resetStore(seed?: Partial<DevSpaceStore>): Promise<DevSpaceStore> {
  const base = defaultStore();
  const store: DevSpaceStore = {
    ...base,
    ...seed,
    sessions: seed?.sessions ?? base.sessions,
    users: seed?.users ?? base.users,
    posts: seed?.posts ?? base.posts,
    comments: seed?.comments ?? base.comments,
    errorLogs: seed?.errorLogs ?? base.errorLogs,
    loopRuns: seed?.loopRuns ?? base.loopRuns,
    apiMetrics: seed?.apiMetrics ?? base.apiMetrics,
    latencyBugFixed: seed?.latencyBugFixed ?? base.latencyBugFixed,
    latencyIncidentOpen: seed?.latencyIncidentOpen ?? base.latencyIncidentOpen,
    latencyIncidentReportedAt: seed?.latencyIncidentReportedAt ?? base.latencyIncidentReportedAt,
    profiles: seed?.profiles ?? base.profiles,
  };
  await writeStore(store);
  return store;
}

export function createSessionToken(): string {
  return randomUUID();
}
