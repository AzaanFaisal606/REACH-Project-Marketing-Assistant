import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRepoContext } from "./fetch-repo";

afterEach(() => vi.restoreAllMocks());

describe("fetchRepoContext", () => {
  it("assembles README + meta into ProjectContext", async () => {
    const meta = { name: "repo", description: "A cool tool", language: "TypeScript", topics: ["cli"] };
    const readme = "# Repo\nDoes cool things.";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/owner/repo")) return new Response(JSON.stringify(meta), { status: 200 });
      if (url.endsWith("/readme")) {
        return new Response(JSON.stringify({ content: btoa(readme), encoding: "base64" }), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });
    const ctx = await fetchRepoContext({ owner: "owner", repo: "repo" });
    expect(ctx).toContain("A cool tool");
    expect(ctx).toContain("Does cool things");
  });

  it("throws a friendly error on 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    await expect(fetchRepoContext({ owner: "x", repo: "y" })).rejects.toThrow(/not found/i);
  });
});
