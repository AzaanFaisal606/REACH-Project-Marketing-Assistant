import { describe, it, expect, beforeEach, vi } from "vitest";
import { storage } from "./storage";

// Minimal chrome.storage.local mock
beforeEach(() => {
  const data: Record<string, unknown> = {};
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) =>
          Object.fromEntries(keys.map((k) => [k, data[k]]))),
        set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
        remove: vi.fn(async (k: string) => { delete data[k]; })
      }
    }
  };
});

describe("storage", () => {
  it("stores and reads the API key obfuscated", async () => {
    await storage.setApiKey("sk-secret");
    expect(await storage.getApiKey()).toBe("sk-secret");
    const raw = (await (globalThis as any).chrome.storage.local.get(["apiKey"])).apiKey;
    expect(raw).not.toContain("secret");
  });
  it("returns empty string when no key set", async () => {
    expect(await storage.getApiKey()).toBe("");
  });
  it("stores and reads provider id", async () => {
    await storage.setProvider("gpt");
    expect(await storage.getProvider()).toBe("gpt");
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
});
