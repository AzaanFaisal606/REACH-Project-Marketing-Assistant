import { describe, it, expect, beforeEach, vi } from "vitest";
import { storage } from "@/lib/storage/storage";

beforeEach(() => {
  const data: Record<string, unknown> = {};
  (globalThis as any).chrome = {
    storage: { local: {
      get: vi.fn(async (k: string[]) => Object.fromEntries(k.map((x) => [x, data[x]]))),
      set: vi.fn(async (o: Record<string, unknown>) => { Object.assign(data, o); }),
      remove: vi.fn(async (x: string) => { delete data[x]; })
    } },
    tabs: { create: vi.fn() }
  };
  vi.resetModules();
});

describe("reddit flow", () => {
  it("finds and ranks communities from the analysis keywords", async () => {
    const redditJson = { data: { children: [
      { data: { display_name: "webdev", title: "Web", public_description: "web apps dev", subscribers: 2000000, over18: false } }
    ] } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(redditJson), { status: 200 }));
    const { reddit, findCommunities, saveSummary } = await import("./state");
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["web", "apps"] });
    await findCommunities();
    expect(reddit.candidates.value[0].name).toBe("webdev");
  });

  it("flags rate limiting with a distinct alert when Reddit returns 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 429 }));
    const { reddit, findCommunities, saveSummary } = await import("./state");
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["web"] });
    await findCommunities();
    expect(reddit.rateLimited.value).toBe(true);
    expect(reddit.error.value).toMatch(/rate-limit/i);
  });

  it("loads an existing draft when a subreddit is selected", async () => {
    // rules fetch returns empty (non-fatal), drafts has a saved entry for webdev
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ rules: [] }), { status: 200 }));
    const mod = await import("./state");
    await storage.setDraft("webdev", { title: "Saved title", body: "Saved body" });
    await mod.selectSubreddit("webdev");
    expect(mod.reddit.selected.value).toBe("webdev");
    expect(mod.reddit.draftTitle.value).toBe("Saved title");
    expect(mod.reddit.draftBody.value).toBe("Saved body");
  });

  it("opens a submit URL for the selected subreddit", async () => {
    const { reddit, openSubmit } = await import("./state");
    reddit.selected.value = "webdev";
    reddit.draftTitle.value = "Title";
    reddit.draftBody.value = "Body";
    openSubmit();
    expect((globalThis as any).chrome.tabs.create).toHaveBeenCalledWith({
      url: "https://www.reddit.com/r/webdev/submit?title=Title&text=Body"
    });
  });

  it("appends new communities on 'find more' without duplicating existing ones", async () => {
    // 12 distinct subs; display caps at 8, so a second pass surfaces the rest.
    // No API key set here → no AI rerank, so ordering is deterministic.
    const children = Array.from({ length: 12 }, (_, i) => ({
      data: { display_name: `sub${i}`, title: "web apps", public_description: "web apps dev", subscribers: 100000 + i, over18: false }
    }));
    // fresh Response per call — a Response body can only be read once
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ data: { children } }), { status: 200 }));
    const { reddit, findCommunities, saveSummary } = await import("./state");
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["web"] });

    await findCommunities();
    expect(reddit.candidates.value.length).toBe(8); // first batch capped at display count

    await findCommunities(true); // find more
    const names = reddit.candidates.value.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length); // no duplicates
    expect(reddit.candidates.value.length).toBe(12); // remaining 4 appended
  });

  it("AI-reranks the pool and attaches fit scores when a key is set", async () => {
    const children = Array.from({ length: 4 }, (_, i) => ({
      data: { display_name: `sub${i}`, title: "web apps", public_description: "web apps dev", subscribers: 100000 + i, over18: false }
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ data: { children } }), { status: 200 }));
    const rerankMod = await import("@/lib/reddit/rerank");
    // stand in for the LLM call: rank sub3 first with a score
    vi.spyOn(rerankMod, "rerankWithAI").mockImplementation(async (_s, pool) =>
      pool.map((c) => ({ ...c, fitScore: c.name === "sub3" ? 99 : 50 }))
         .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)));
    const { reddit, appState, findCommunities, saveSummary } = await import("./state");
    appState.apiKey.value = "key-present";
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["web"] });

    await findCommunities();
    expect(reddit.candidates.value[0].name).toBe("sub3");
    expect(reddit.candidates.value[0].fitScore).toBe(99);
  });

  it("flags subs that restrict self-promotion on select", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ rules: [{ short_name: "No self-promotion", description: "" }] }), { status: 200 })
    );
    const { reddit, selectSubreddit } = await import("./state");
    await selectSubreddit("somesub");
    expect(reddit.restrictsPromo.value).toBe(true);
  });

  it("clears a stale reddit session when a new project is analyzed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ rules: [] }), { status: 200 }));
    const { storage } = await import("@/lib/storage/storage");
    const { reddit, appState, runAnalysis } = await import("./state");
    // Seed a prior flow
    reddit.candidates.value = [{ name: "old", title: "Old", description: "d", subscribers: 1000, over18: false }];
    reddit.selected.value = "old";
    await storage.setRedditSession({ candidates: reddit.candidates.value, selected: "old", rules: [] });
    // Analyze a new project (analyze() is mocked via the provider generate path; stub it)
    appState.apiKey.value = "k";
    const analyzeMod = await import("@/lib/analysis/analyze");
    vi.spyOn(analyzeMod, "analyze").mockResolvedValue({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["new"] });
    await runAnalysis("new project");
    expect(reddit.candidates.value).toEqual([]);
    expect(reddit.selected.value).toBeNull();
    expect(await storage.getRedditSession()).toBeNull();
  });

  it("resumes a persisted reddit session on hydrate", async () => {
    const { storage } = await import("@/lib/storage/storage");
    await storage.setRedditSession({
      candidates: [{ name: "webdev", title: "Web", description: "d", subscribers: 1000, over18: false }],
      selected: "webdev",
      rules: [{ name: "No advertising", description: "" }]
    });
    await storage.setDraft("webdev", { title: "Resumed", body: "Body" });
    const { reddit, appState, hydrate } = await import("./state");
    appState.apiKey.value = "k";
    await hydrate();
    expect(reddit.candidates.value.map((c) => c.name)).toEqual(["webdev"]);
    expect(reddit.selected.value).toBe("webdev");
    expect(reddit.restrictsPromo.value).toBe(true);
    expect(reddit.draftTitle.value).toBe("Resumed");
  });
});
