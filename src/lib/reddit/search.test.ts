import { describe, it, expect } from "vitest";
import { searchSubreddits } from "./search";

// searchSubreddits now queries the bundled offline dataset
// (src/lib/reddit/data/subreddits.json) instead of hitting Reddit. These tests
// assert the offline contract against the real shipped snapshot.

describe("searchSubreddits (offline dataset)", () => {
  it("finds well-known subreddits by keyword", async () => {
    const out = await searchSubreddits(["webdev"]);
    expect(out.some((c) => c.name === "webdev")).toBe(true);
  });

  it("returns SubredditCandidate-shaped rows", async () => {
    const out = await searchSubreddits(["programming"]);
    expect(out.length).toBeGreaterThan(0);
    const c = out[0];
    expect(c).toHaveProperty("name");
    expect(c).toHaveProperty("title");
    expect(c).toHaveProperty("description");
    expect(typeof c.subscribers).toBe("number");
    expect(c.over18).toBe(false);
  });

  it("merges and dedupes across multiple keywords", async () => {
    const out = await searchSubreddits(["web", "dev", "frontend"]);
    const names = out.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length); // no dupes
  });

  it("returns an empty array for no keywords", async () => {
    expect(await searchSubreddits([])).toEqual([]);
    expect(await searchSubreddits(["   "])).toEqual([]);
  });

  it("returns an empty array when nothing matches", async () => {
    const out = await searchSubreddits(["zzqqxxnomatchkeyword123"]);
    expect(out).toEqual([]);
  });

  it("only returns subreddits meeting the dataset floor (>=1000 subs)", async () => {
    const out = await searchSubreddits(["gaming"]);
    expect(out.every((c) => c.subscribers >= 1000)).toBe(true);
  });
});
