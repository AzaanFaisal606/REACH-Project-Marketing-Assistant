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
});
