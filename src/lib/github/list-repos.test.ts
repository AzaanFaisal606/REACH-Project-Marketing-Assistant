import { describe, it, expect, vi, afterEach } from "vitest";
import { listUserRepos, timeAgo } from "./list-repos";

const gh = (n: number, prefix = "repo") =>
  Array.from({ length: n }, (_, i) => ({
    full_name: `me/${prefix}${i}`, html_url: `https://github.com/me/${prefix}${i}`,
    private: i % 2 === 0, description: i === 0 ? "A Chrome extension" : null, pushed_at: "2026-10-01T00:00:00Z"
  }));

afterEach(() => vi.unstubAllGlobals());

describe("listUserRepos", () => {
  it("pages until a short page and maps fields", async () => {
    const pages = [gh(100, "a"), gh(3, "b")];
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { urls.push(url); return new Response(JSON.stringify(pages.shift())); }));
    const repos = await listUserRepos("tok");
    expect(repos).toHaveLength(103);
    expect(repos[0]).toEqual({
      fullName: "me/a0", url: "https://github.com/me/a0", private: true,
      description: "A Chrome extension", pushedAt: "2026-10-01T00:00:00Z"
    });
    expect(repos[1].description).toBe("");
    expect(urls[1]).toContain("page=2");
  });
  it("asks for a reconnect when the token is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(listUserRepos("bad")).rejects.toThrow(/Reconnect GitHub/);
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  it("formats relative times", () => {
    expect(timeAgo("2026-10-05T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-05T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-10-02T12:00:00Z", now)).toBe("3d ago");
    expect(timeAgo("2025-09-01T12:00:00Z", now)).toBe("1y ago");
    expect(timeAgo("", now)).toBe("");
  });
});
