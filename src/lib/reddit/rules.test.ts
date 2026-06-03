import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchSubredditRules } from "./rules";

afterEach(() => vi.restoreAllMocks());

describe("fetchSubredditRules", () => {
  it("returns rule short-names and descriptions", async () => {
    const json = { rules: [
      { short_name: "No spam", description: "Don't spam." },
      { short_name: "Be civil", description: "" }
    ] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(json), { status: 200 }));
    const rules = await fetchSubredditRules("webdev");
    expect(rules).toEqual([
      { name: "No spam", description: "Don't spam." },
      { name: "Be civil", description: "" }
    ]);
  });
  it("returns empty array when rules call fails (non-fatal)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    expect(await fetchSubredditRules("webdev")).toEqual([]);
  });
});
