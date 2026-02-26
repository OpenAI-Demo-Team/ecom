import { describe, expect, it } from "vitest";
import { generateProfilePrDraft } from "@/src/backend/services/profilePrService";

describe("profile PR draft generation", () => {
  it("returns a fallback PR draft when API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const draft = await generateProfilePrDraft({
      username: "jack",
      displayName: "Jack Chen",
      base: {
        prompt: "cyberpunk hacker terminal",
        html: "<div class='vibe-profile'><h1>Old</h1></div>",
        css: ".vibe-profile { color: #0f0; }",
      },
      head: {
        prompt: "tropical maximalist explosion",
        html: "<div class='vibe-profile'><h1>New</h1></div>",
        css: ".vibe-profile { color: #ff1493; }",
      },
    });

    expect(draft.provider).toBe("fallback");
    expect(draft.title).toContain("@jack");
    expect(draft.body).toContain("Summary");
    expect(draft.branchName).toContain("profile/jack");
    expect(draft.diff).toContain("diff --git");
    expect(draft.providerReason).toContain("OPENAI_API_KEY");
  });
});
