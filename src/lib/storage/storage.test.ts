import { describe, it, expect, beforeEach, vi } from "vitest";
import { storage } from "./storage";
import { memoryArea } from "@/test-utils/storage-area";

// Minimal chrome.storage.local mock
beforeEach(() => {
  const data: Record<string, unknown> = {};
  (globalThis as any).chrome = {
    storage: {
      session: memoryArea(),
      local: {
        get: vi.fn(async (keys: string[]) =>
          Object.fromEntries(keys.map((k) => [k, data[k]]))),
        set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
        remove: vi.fn(async (k: string | string[]) => { for (const key of [k].flat()) delete data[key]; })
      }
    }
  };
});

describe("storage", () => {
  it("keeps a separate key per provider", async () => {
    await storage.setApiKey("openai", "sk-o");
    await storage.setApiKey("deepseek", "sk-d");
    expect((await storage.getProviderSettings()).apiKeys).toEqual({ openai: "sk-o", deepseek: "sk-d" });
  });
  it("keeps both entries when two providers save at the same time", async () => {
    await Promise.all([storage.setModel("openai", "a"), storage.setModel("groq", "b")]);
    expect((await storage.getProviderSettings()).models).toEqual({ openai: "a", groq: "b" });
  });
  it("drops an unreadable stored key instead of failing to load settings", async () => {
    await storage.setApiKey("openai", "sk-o");
    const { apiKeys } = await chrome.storage.local.get(["apiKeys"]) as { apiKeys: Record<string, string> };
    await chrome.storage.local.set({ apiKeys: { ...apiKeys, groq: "%%not-base64%%" } });
    expect((await storage.getProviderSettings()).apiKeys).toEqual({ openai: "sk-o" });
  });
  it("stores keys obfuscated, never plain", async () => {
    await storage.setApiKey("groq", "gsk-secret");
    expect(JSON.stringify(await chrome.storage.local.get(["apiKeys"]))).not.toContain("gsk-secret");
  });
  it("returns empty settings when nothing is saved", async () => {
    expect(await storage.getProviderSettings()).toEqual({ apiKeys: {}, baseUrls: {}, models: {} });
  });
  it("stores base URLs and models per provider; empty string clears", async () => {
    await storage.setBaseUrl("vllm", "http://box:8000/v1");
    await storage.setModel("vllm", "qwen");
    await storage.setModel("lmstudio", "m");
    await storage.setModel("lmstudio", "");
    const s = await storage.getProviderSettings();
    expect(s.baseUrls).toEqual({ vllm: "http://box:8000/v1" });
    expect(s.models).toEqual({ vllm: "qwen" });
  });
  it("stores and reads a known provider id", async () => {
    await storage.setProvider("openrouter");
    expect(await storage.getProvider()).toBe("openrouter");
  });
  it("accumulates drafts without clobbering existing ones", async () => {
    await storage.setDraft("webdev", { title: "T1", body: "B1" });
    await storage.setDraft("rust", { title: "T2", body: "B2" });
    const drafts = await storage.getDrafts();
    expect(drafts).toEqual({
      webdev: { title: "T1", body: "B1" },
      rust: { title: "T2", body: "B2" }
    });
  });
  it("returns undefined for an invalid stored provider", async () => {
    await chrome.storage.local.set({ provider: "bogus-provider" });
    expect(await storage.getProvider()).toBeUndefined();
  });
  it("returns undefined for a malformed stored summary", async () => {
    await chrome.storage.local.set({ summary: { valueProp: 123 } });
    expect(await storage.getSummary()).toBeUndefined();
  });

  it("round-trips the reddit session (candidates, selected, rules)", async () => {
    const session = {
      candidates: [{ name: "webdev", title: "Web", description: "d", subscribers: 1000, over18: false }],
      selected: "webdev",
      rules: [{ name: "Be nice", description: "" }]
    };
    await storage.setRedditSession(session);
    expect(await storage.getRedditSession()).toEqual(session);
  });

  it("returns null when no reddit session stored", async () => {
    expect(await storage.getRedditSession()).toBeNull();
  });

  it("clears the reddit session", async () => {
    await storage.setRedditSession({ candidates: [], selected: null, rules: [] });
    await storage.clearRedditSession();
    expect(await storage.getRedditSession()).toBeNull();
  });
  it("keeps work in progress in session storage, settings in local", async () => {
    await storage.setRedditSession({ candidates: [], selected: "webdev", rules: [] });
    await storage.setLinkedinDraft("post");
    await storage.setProvider("openai");
    expect(await chrome.storage.local.get(["redditSession", "linkedinDraft"])).toEqual({ redditSession: undefined, linkedinDraft: undefined });
    expect((await chrome.storage.session.get(["linkedinDraft"])).linkedinDraft).toBe("post");
    expect((await chrome.storage.local.get(["provider"])).provider).toBe("openai");
  });
  it("clears work in progress that older versions left in local storage", async () => {
    await chrome.storage.local.set({ summary: { valueProp: "x" }, xSession: {}, provider: "openai" });
    await storage.clearLegacyLocalSession();
    const left = await chrome.storage.local.get(["summary", "xSession", "provider"]);
    expect(left.summary).toBeUndefined();
    expect(left.xSession).toBeUndefined();
    expect(left.provider).toBe("openai");
  });
});
