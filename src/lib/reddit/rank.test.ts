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

  // Regression: multi-word keywords must match on word tokens, not the whole
  // phrase verbatim. A model emitting "neural style transfer" should still match
  // r/neuralstyle (name has no spaces) and r/deepstyle (shares "style"). The old
  // whole-phrase substring filter zeroed these out — see the fashion-tech repro.
  it("matches multi-word keywords by word token, not verbatim phrase", () => {
    const subs: SubredditCandidate[] = [
      { name: "neuralstyle", title: "Neural Style", description: "style transfer art", subscribers: 50_000, over18: false },
      { name: "deepstyle", title: "Deep Style", description: "deep learning style", subscribers: 30_000, over18: false },
      { name: "cooking", title: "Cooking", description: "recipes and food", subscribers: 3_000_000, over18: false }
    ];
    const ranked = rankSubreddits(subs, ["neural style transfer", "image segmentation"]);
    expect(ranked.find((r) => r.name === "neuralstyle")).toBeDefined();
    expect(ranked.find((r) => r.name === "deepstyle")).toBeDefined();
    expect(ranked.find((r) => r.name === "cooking")).toBeUndefined(); // shares no token
  });

  it("drops subs that share only pure glue words (the/and/with) with keywords", () => {
    // A keyword phrase's glue words must not rescue an off-topic sub. Only the
    // content tokens (clothing/design/textile) should drive a match.
    const subs: SubredditCandidate[] = [
      { name: "randomchatter", title: "The Daily and Random", description: "for you and your friends with stories", subscribers: 100_000, over18: false },
      { name: "fashiontech", title: "Fashion Tech", description: "clothing design and textile work", subscribers: 80_000, over18: false }
    ];
    const ranked = rankSubreddits(subs, ["the design and", "clothing textile"]);
    // fashiontech matches clothing/design/textile; randomchatter only overlaps on
    // stopwords (the/and/for/you/your/with) → zero real overlap → dropped.
    expect(ranked.find((r) => r.name === "fashiontech")).toBeDefined();
    expect(ranked.find((r) => r.name === "randomchatter")).toBeUndefined();
  });
});
