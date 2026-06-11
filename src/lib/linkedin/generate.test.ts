import { describe, it, expect, vi } from "vitest";
import { generateLinkedInPost, LINKEDIN_MAX } from "./generate";
import type { ProjectSummary } from "@/lib/analysis/types";
import type { Provider, ProviderConfig, GenerateInput } from "@/lib/providers/types";

const summary: ProjectSummary = {
  valueProp: "v", targetUser: "u", keyFeatures: ["f"], tone: "t", keywords: ["k"]
};
const provider = {} as Provider;
const config: ProviderConfig = { apiKey: "x" };

function genReturning(raw: string) {
  return vi.fn(async (_p: Provider, _i: GenerateInput, _c: ProviderConfig) => raw);
}

describe("generateLinkedInPost", () => {
  it("exposes the 3000-char LinkedIn cap", () => {
    expect(LINKEDIN_MAX).toBe(3000);
  });

  it("parses a plain JSON post", async () => {
    const gen = genReturning('{ "post": "hello world" }');
    const out = await generateLinkedInPost(summary, false, "", provider, config, gen);
    expect(out).toBe("hello world");
    expect(gen).toHaveBeenCalledOnce();
  });

  it("parses JSON wrapped in code fences", async () => {
    const gen = genReturning('```json\n{ "post": "fenced" }\n```');
    const out = await generateLinkedInPost(summary, true, "", provider, config, gen);
    expect(out).toBe("fenced");
  });

  it("parses JSON with surrounding prose", async () => {
    const gen = genReturning('Sure! { "post": "noisy" } hope that helps');
    expect(await generateLinkedInPost(summary, false, "", provider, config, gen)).toBe("noisy");
  });

  it("throws on malformed JSON", async () => {
    const gen = genReturning("not json at all");
    await expect(generateLinkedInPost(summary, false, "", provider, config, gen)).rejects.toThrow();
  });
});
