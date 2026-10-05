import { describe, it, expect, beforeEach, vi } from "vitest";
import { storage } from "@/lib/storage/storage";

beforeEach(() => {
  const data: Record<string, unknown> = {};
  (globalThis as any).chrome = {
    storage: { local: {
      get: vi.fn(async (k: string[]) => Object.fromEntries(k.map((x) => [x, data[x]]))),
      set: vi.fn(async (o: Record<string, unknown>) => { Object.assign(data, o); }),
      remove: vi.fn(async (x: string | string[]) => { for (const key of [x].flat()) delete data[key]; })
    } },
    tabs: { create: vi.fn() },
    permissions: { contains: vi.fn(async () => true), request: vi.fn(async () => true) }
  };
  vi.resetModules();
});

describe("reddit flow", () => {
  it("finds and ranks communities from the analysis keywords", async () => {
    // Community search is now offline (bundled dataset). r/webdev is in the
    // snapshot and matches these keywords, so it should surface in the results.
    const { reddit, findCommunities, saveSummary } = await import("./state");
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["webdev", "web development"] });
    await findCommunities();
    expect(reddit.candidates.value.length).toBeGreaterThan(0);
    expect(reddit.candidates.value.some((c) => c.name === "webdev")).toBe(true);
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
    // Broad keywords match many subs in the offline dataset; display caps the
    // first batch, so a second pass ("find more") surfaces additional ones.
    // No API key set here → no AI rerank, so ordering is deterministic.
    const { reddit, findCommunities, saveSummary } = await import("./state");
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["game", "gaming", "games"] });

    await findCommunities();
    const firstBatch = reddit.candidates.value.length;
    expect(firstBatch).toBeGreaterThan(0);

    await findCommunities(true); // find more
    const names = reddit.candidates.value.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length); // no duplicates
    expect(reddit.candidates.value.length).toBeGreaterThanOrEqual(firstBatch);
  });

  it("AI-reranks the pool and attaches fit scores when a key is set", async () => {
    const rerankMod = await import("@/lib/reddit/rerank");
    // Stand in for the LLM call: score the first pooled sub highest, so we can
    // assert the reranked order and attached fitScore flow through unchanged.
    vi.spyOn(rerankMod, "rerankWithAI").mockImplementation(async (_s, pool) => {
      const top = pool[0]?.name;
      return pool
        .map((c) => ({ ...c, fitScore: c.name === top ? 99 : 50 }))
        .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
    });
    const { reddit, appState, findCommunities, saveSummary } = await import("./state");
    appState.providerSettings.value = { apiKeys: { claude: "key-present" }, baseUrls: {}, models: {} };
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["webdev", "programming"] });

    await findCommunities();
    expect(reddit.candidates.value.length).toBeGreaterThan(0);
    expect(reddit.candidates.value[0].fitScore).toBe(99);
  });

  it("toggles a subreddit off when clicked again, restoring the general draft", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ rules: [] }), { status: 200 }));
    const { storage } = await import("@/lib/storage/storage");
    const { reddit, selectSubreddit } = await import("./state");
    // A general (no-sub) draft exists; a sub-specific draft exists too.
    await storage.setDraft("__general__", { title: "General title", body: "General body" });
    await storage.setDraft("webdev", { title: "Webdev title", body: "Webdev body" });

    await selectSubreddit("webdev");
    expect(reddit.selected.value).toBe("webdev");
    expect(reddit.draftTitle.value).toBe("Webdev title");

    // Click the same sub again → deselect, fall back to the general draft.
    await selectSubreddit("webdev");
    expect(reddit.selected.value).toBeNull();
    expect(reddit.rules.value).toEqual([]);
    expect(reddit.draftTitle.value).toBe("General title");
    expect(reddit.draftBody.value).toBe("General body");
  });

  it("generates a post with no subreddit selected, saving it to the general slot", async () => {
    // No fetch for rules needed; generation goes through the provider path.
    const genMod = await import("@/lib/providers/types");
    vi.spyOn(genMod, "generate").mockResolvedValue(JSON.stringify({ title: "Generic T", body: "Generic B" }));
    const { storage } = await import("@/lib/storage/storage");
    const { reddit, appState, generatePost, saveSummary } = await import("./state");
    appState.providerSettings.value = { apiKeys: { claude: "k" }, baseUrls: {}, models: {} };
    await saveSummary({ valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["k"] });
    reddit.selected.value = null; // explicitly no sub

    await generatePost();
    expect(reddit.draftTitle.value).toBe("Generic T");
    expect(reddit.draftBody.value).toBe("Generic B");
    const drafts = await storage.getDrafts();
    expect(drafts["__general__"]).toEqual({ title: "Generic T", body: "Generic B" });
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
    appState.providerSettings.value = { apiKeys: { claude: "k" }, baseUrls: {}, models: {} };
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
    appState.providerSettings.value = { apiKeys: { claude: "k" }, baseUrls: {}, models: {} };
    await hydrate();
    expect(reddit.candidates.value.map((c) => c.name)).toEqual(["webdev"]);
    expect(reddit.selected.value).toBe("webdev");
    expect(reddit.restrictsPromo.value).toBe(true);
    expect(reddit.draftTitle.value).toBe("Resumed");
  });
});
