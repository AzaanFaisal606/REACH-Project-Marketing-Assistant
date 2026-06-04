import { describe, it, expect } from "vitest";
import { rankSubreddits, type SubredditCandidate } from "./rank";

const candidates: SubredditCandidate[] = [
  { name: "webdev", title: "Web Development", description: "build websites and web apps", subscribers: 2_000_000, over18: false },
  { name: "tinysubreddit", title: "Tiny", description: "web apps", subscribers: 50, over18: false },
  { name: "nsfwsub", title: "x", description: "web apps", subscribers: 500_000, over18: true },
  { name: "cooking", title: "Cooking", description: "recipes and food", subscribers: 3_000_000, over18: false }
];

describe("rankSubreddits", () => {
  it("ranks keyword-relevant subs above irrelevant ones", () => {
    const ranked = rankSubreddits(candidates, ["web", "apps", "developer"]);
    expect(ranked[0].name).toBe("webdev");
    expect(ranked.find((r) => r.name === "cooking")).toBeUndefined(); // zero overlap dropped
  });
  it("filters out over18 and tiny subs", () => {
    const ranked = rankSubreddits(candidates, ["web", "apps"]);
    expect(ranked.find((r) => r.name === "nsfwsub")).toBeUndefined();
    expect(ranked.find((r) => r.name === "tinysubreddit")).toBeUndefined();
  });
  it("returns at most 5", () => {
    const many: SubredditCandidate[] = Array.from({ length: 12 }, (_, i) => ({
      name: `sub${i}`, title: "web apps dev", description: "web apps", subscribers: 10_000 + i, over18: false
    }));
    expect(rankSubreddits(many, ["web", "apps"]).length).toBe(5);
  });

  it("reserves a slot for a geography match that topic subs would otherwise crowd out", () => {
    // 5 big topic subs (multi-keyword overlap, huge) + 1 small geo sub (single overlap).
    const big: SubredditCandidate[] = Array.from({ length: 5 }, (_, i) => ({
      name: `pcgaming${i}`, title: "PC gaming building", description: "pc building gaming rigs", subscribers: 2_000_000 + i, over18: false
    }));
    const geo: SubredditCandidate = {
      name: "pakistan", title: "Pakistan", description: "everything Pakistan", subscribers: 400_000, over18: false
    };
    const ranked = rankSubreddits([...big, geo], ["pc building", "gaming", "Pakistan"], { geography: ["Pakistan"] });
    expect(ranked.find((r) => r.name === "pakistan")).toBeDefined(); // not crowded out
    expect(ranked.length).toBe(5);
  });

  it("does not force a geo slot when no candidate matches the geography", () => {
    const subs: SubredditCandidate[] = Array.from({ length: 6 }, (_, i) => ({
      name: `topic${i}`, title: "web apps", description: "web apps dev", subscribers: 100_000 + i, over18: false
    }));
    const ranked = rankSubreddits(subs, ["web", "apps"], { geography: ["Pakistan"] });
    expect(ranked.length).toBe(5);
    expect(ranked.every((r) => r.name.startsWith("topic"))).toBe(true);
  });

  it("still works with no facets argument (back-compat)", () => {
    const ranked = rankSubreddits(candidates, ["web", "apps"]);
    expect(ranked[0].name).toBe("webdev");
  });
});
