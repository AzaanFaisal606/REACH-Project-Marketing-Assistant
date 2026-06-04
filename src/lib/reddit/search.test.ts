import { describe, it, expect, vi, afterEach } from "vitest";
import { searchSubreddits } from "./search";

afterEach(() => vi.restoreAllMocks());

function jsonResponse(names: string[]): Response {
  const children = names.map((n) => ({
    data: {
      display_name: n,
      title: n,
      public_description: `about ${n}`,
      subscribers: 100_000,
      over18: false
    }
  }));
  return new Response(JSON.stringify({ data: { children } }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

describe("searchSubreddits", () => {
  it("maps Reddit search JSON into candidates", async () => {
    const redditJson = {
      data: { children: [
        { data: { display_name: "webdev", title: "Web Dev", public_description: "build web apps", subscribers: 2000000, over18: false } },
        { data: { display_name: "rust", title: "Rust", public_description: "systems lang", subscribers: 250000, over18: false } }
      ] }
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(redditJson), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const out = await searchSubreddits(["web"]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: "webdev", subscribers: 2000000, over18: false });
  });

  it("queries the next keyword when the first returns few, merging results", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("q=react")) return Promise.resolve(jsonResponse(["reactjs"]));
      if (url.includes("q=python")) return Promise.resolve(jsonResponse(["python"]));
      return Promise.resolve(jsonResponse([]));
    });
    const out = await searchSubreddits(["react", "python"]);
    expect(fetchMock.mock.calls.length).toBe(2); // both queried (first was sparse)
    const names = out.map((c) => c.name).sort();
    expect(names).toEqual(["python", "reactjs"]);
  });

  it("stops early once it has enough candidates (avoids extra requests)", async () => {
    const many = Array.from({ length: 20 }, (_, i) => `sub${i}`);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(many));
    const out = await searchSubreddits(["a", "b", "c", "d"]);
    expect(fetchMock.mock.calls.length).toBe(1); // first query already had enough
    expect(out.length).toBe(20);
  });

  it("dedupes the same subreddit returned for multiple keywords", async () => {
    // fresh Response per call — a body can only be read once
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(["webdev"]));
    const out = await searchSubreddits(["web", "dev", "frontend"]);
    expect(out.filter((c) => c.name === "webdev")).toHaveLength(1);
  });

  it("ignores a keyword whose request fails but keeps the others", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("q=good")) return Promise.resolve(jsonResponse(["goodsub"]));
      return Promise.resolve(new Response("nope", { status: 500 }));
    });
    const out = await searchSubreddits(["bad", "good"]);
    expect(out.map((c) => c.name)).toContain("goodsub");
  });

  it("throws a friendly error when every request is blocked (403)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Blocked</html>", { status: 403, headers: { "Content-Type": "text/html" } })
    );
    await expect(searchSubreddits(["x", "y"])).rejects.toThrow(/reddit/i);
  });

  it("throws a friendly error when Reddit returns HTML instead of JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>not json</html>", { status: 200, headers: { "Content-Type": "text/html" } })
    );
    await expect(searchSubreddits(["x"])).rejects.toThrow(/reddit/i);
  });

  it("throws a friendly error on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 429, headers: { "Content-Type": "text/html" } })
    );
    await expect(searchSubreddits(["x"])).rejects.toThrow(/rate/i);
  });
});
