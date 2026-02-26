import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStore, resetStore } from "@/src/backend/db/store";
import { generateProfile } from "@/src/backend/services/profileGenerator";

describe("profile generation", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "devspace-profile-"));
    process.env.STORE_PATH = path.join(tempDir, "store.json");
    await resetStore();
  });

  afterEach(async () => {
    delete process.env.STORE_PATH;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("seeded profiles have avatarUrl", async () => {
    const store = await readStore();

    for (const profile of store.profiles) {
      expect(profile.avatarUrl).toBeDefined();
      expect(profile.avatarUrl.length).toBeGreaterThan(0);
    }
  });

  it("seeded profile items have imageUrl", async () => {
    const store = await readStore();

    for (const profile of store.profiles) {
      for (const item of profile.items) {
        expect(item.imageUrl).toBeDefined();
        expect(item.imageUrl.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns fallback profile when no API key is set", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateProfile({
      prompt: "cyberpunk hacker, neon green",
      displayName: "Test User",
      bio: "A test bio",
      items: [{ name: "Widget", price: "19" }],
    });

    expect(result.provider).toBe("fallback");
    expect(result.html).toContain("vibe-profile");
    expect(result.html).toContain("vibe-fx");
    expect(result.html).toContain("vibe-content");
    expect(result.css).toContain(".vibe-profile");
    expect(result.html).toContain("Test User");
    expect(result.html).toContain("Widget");
  });

  it("fallback themes differ for different vibe prompts", async () => {
    delete process.env.OPENAI_API_KEY;

    const cyberpunk = await generateProfile({
      prompt: "cyberpunk hacker terminal with neon glow",
      displayName: "Theme A",
      bio: "",
      items: [{ name: "A", price: "10" }],
    });

    const brutalist = await generateProfile({
      prompt: "brutalist raw black and white layout",
      displayName: "Theme B",
      bio: "",
      items: [{ name: "B", price: "12" }],
    });

    expect(cyberpunk.provider).toBe("fallback");
    expect(brutalist.provider).toBe("fallback");
    expect(cyberpunk.html).toContain("theme-cyberpunk");
    expect(brutalist.html).toContain("theme-brutalist");
    expect(cyberpunk.css).not.toEqual(brutalist.css);
  });

  it("infers tab order when prompt asks to prioritize shop", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateProfile({
      prompt: "minimal zen style, shop first and posts second",
      displayName: "Layout User",
      bio: "",
      items: [{ name: "Desk Mat", price: "22" }],
    });

    expect(result.provider).toBe("fallback");
    expect(result.layout?.tabOrder?.[0]).toBe("shop");
  });

  it("strips script tags from generated output", async () => {
    const result = await generateProfile({
      prompt: "minimal",
      displayName: "Safe User",
      bio: "",
      items: [],
    });

    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("</script>");
  });

  it("sanitizes unsafe html attributes and fixed positioning from codex output", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const originalFetch = global.fetch;

    const payload = {
      output_text: `{
        "html": "<div class=\\"vibe-profile\\"><img src=\\"x\\" onerror=\\"alert(1)\\" /><script>alert('x')</script></div>",
        "css": ".vibe-profile { position: fixed; color: red; }"
      }`,
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    try {
      const result = await generateProfile({
        prompt: "cyberpunk",
        displayName: "Safe Output",
        bio: "",
        items: [],
      });

      expect(result.provider).toBe("codex");
      expect(result.html).not.toContain("onerror=");
      expect(result.html).not.toContain("<script");
      expect(result.css).not.toMatch(/position\s*:\s*fixed/i);
      expect(result.css).toMatch(/position\s*:\s*relative/i);
    } finally {
      global.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("store has pre-seeded profiles with unique vibes", async () => {
    const store = await readStore();
    expect(store.profiles.length).toBeGreaterThanOrEqual(6);

    const usernames = store.profiles.map((p) => p.username);
    expect(usernames).toContain("jack");
    expect(usernames).toContain("mira");
    expect(usernames).toContain("nova");

    const jack = store.profiles.find((p) => p.username === "jack")!;
    const mira = store.profiles.find((p) => p.username === "mira")!;
    expect(jack.generatedCss).not.toBe(mira.generatedCss);
    expect(jack.vibePrompt).toContain("cyberpunk");
    expect(mira.vibePrompt).toContain("pink");
  });
});
