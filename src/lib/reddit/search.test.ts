import { describe, it, expect, vi, afterEach } from "vitest";
import { searchSubreddits } from "./search";

afterEach(() => vi.restoreAllMocks());

describe("searchSubreddits", () => {
  it("maps Reddit search JSON into candidates", async () => {
    const redditJson = {
      data: { children: [
        { data: { display_name: "webdev", title: "Web Dev", public_description: "build web apps", subscribers: 2000000, over18: false } },
        { data: { display_name: "rust", title: "Rust", public_description: "systems lang", subscribers: 250000, over18: false } }
      ] }
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(redditJson), { status: 200 })
    );
    const out = await searchSubreddits(["web", "apps"]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: "webdev", subscribers: 2000000, over18: false });
  });

  it("throws a friendly error on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 429 }));
    await expect(searchSubreddits(["x"])).rejects.toThrow(/rate/i);
  });
});
