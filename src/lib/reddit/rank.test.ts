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
});
