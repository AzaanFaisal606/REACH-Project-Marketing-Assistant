import { describe, it, expect, vi } from "vitest";
import { rerankWithAI } from "./rerank";
import type { SubredditCandidate } from "./rank";
import type { ProjectSummary } from "@/lib/analysis/types";
import type { Provider } from "@/lib/providers/types";

const summary: ProjectSummary = {
  valueProp: "PC parts price comparison for Pakistan",
  targetUser: "PC builders in Pakistan",
  keyFeatures: ["marketplace", "price history"],
  tone: "technical",
  keywords: ["pc building", "Pakistan"],
  facets: { topic: ["pc building"], geography: ["Pakistan"] }
};

const cands: SubredditCandidate[] = [
  { name: "buildapc", title: "Build A PC", description: "pc building help", subscribers: 7_000_000, over18: false },
  { name: "pcmasterrace", title: "PCMR", description: "pc gaming", subscribers: 13_000_000, over18: false },
  { name: "pakistan", title: "Pakistan", description: "everything Pakistan", subscribers: 600_000, over18: false }
];

const provider = { id: "openai-compat" } as Provider;
const config = { label: "Fake", baseUrl: "", model: "m" };

describe("rerankWithAI", () => {
  it("reorders candidates by the AI's scores and attaches fitScore", async () => {
    const gen = vi.fn(async () => JSON.stringify([
      { name: "pakistan", score: 95 },
      { name: "buildapc", score: 70 },
      { name: "pcmasterrace", score: 40 }
    ]));
    const out = await rerankWithAI(summary, cands, provider, config, gen);
    expect(out.map((c) => c.name)).toEqual(["pakistan", "buildapc", "pcmasterrace"]);
    expect(out[0].fitScore).toBe(95);
  });

  it("strips code fences around the JSON", async () => {
    const gen = vi.fn(async () => "```json\n[{\"name\":\"buildapc\",\"score\":80}]\n```");
    const out = await rerankWithAI(summary, cands, provider, config, gen);
    expect(out[0].name).toBe("buildapc");
    expect(out[0].fitScore).toBe(80);
  });

  it("keeps candidates the AI omitted, ranked after the scored ones", async () => {
    const gen = vi.fn(async () => JSON.stringify([{ name: "pakistan", score: 90 }]));
    const out = await rerankWithAI(summary, cands, provider, config, gen);
    expect(out[0].name).toBe("pakistan");
    // the two omitted subs are still present (not dropped)
    expect(out.map((c) => c.name).sort()).toEqual(["buildapc", "pakistan", "pcmasterrace"]);
  });

  it("ignores AI-invented subreddit names not in the candidate pool", async () => {
    const gen = vi.fn(async () => JSON.stringify([
      { name: "totallyfakesub", score: 99 },
      { name: "buildapc", score: 60 }
    ]));
    const out = await rerankWithAI(summary, cands, provider, config, gen);
    expect(out.find((c) => c.name === "totallyfakesub")).toBeUndefined();
    expect(out.map((c) => c.name).sort()).toEqual(["buildapc", "pakistan", "pcmasterrace"]);
  });

  it("falls back to the original order when the AI returns junk", async () => {
    const gen = vi.fn(async () => "not json at all");
    const out = await rerankWithAI(summary, cands, provider, config, gen);
    expect(out.map((c) => c.name)).toEqual(["buildapc", "pcmasterrace", "pakistan"]); // unchanged
    expect(out[0].fitScore).toBeUndefined();
  });

  it("falls back to the original order when the AI call throws", async () => {
    const gen = vi.fn(async () => { throw new Error("rate limited"); });
    const out = await rerankWithAI(summary, cands, provider, config, gen);
    expect(out.map((c) => c.name)).toEqual(["buildapc", "pcmasterrace", "pakistan"]);
  });

  it("returns input unchanged for an empty candidate list without calling the AI", async () => {
    const gen = vi.fn(async () => "[]");
    const out = await rerankWithAI(summary, [], provider, config, gen);
    expect(out).toEqual([]);
    expect(gen).not.toHaveBeenCalled();
  });

  it("clamps out-of-range scores to 0-100", async () => {
    const gen = vi.fn(async () => JSON.stringify([
      { name: "buildapc", score: 250 },
      { name: "pakistan", score: -5 }
    ]));
    const out = await rerankWithAI(summary, cands, provider, config, gen);
    const byName = Object.fromEntries(out.map((c) => [c.name, c.fitScore]));
    expect(byName.buildapc).toBe(100);
    expect(byName.pakistan).toBe(0);
  });
});
