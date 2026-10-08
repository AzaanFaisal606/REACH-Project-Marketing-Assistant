import { describe, it, expect, beforeEach, vi } from "vitest";
import { memoryArea } from "@/test-utils/storage-area";

let granted: boolean;
beforeEach(() => {
  const data: Record<string, unknown> = {};
  granted = true;
  (globalThis as any).chrome = {
    storage: { session: memoryArea(), local: {
      get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]))),
      set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
      remove: vi.fn(async (k: string | string[]) => { for (const key of [k].flat()) delete data[key]; })
    } },
    permissions: { contains: vi.fn(async () => granted), request: vi.fn(async () => granted) }
  };
  vi.resetModules();
});

describe("hydrate", () => {
  it("restores the provider and its saved settings", async () => {
    const { storage } = await import("@/lib/storage/storage");
    await storage.setProvider("openrouter");
    await storage.setApiKey("openrouter", "sk-or");
    await storage.setModel("openrouter", "moonshotai/kimi-k2.6");
    const { hydrate, appState } = await import("./state");
    await hydrate();
    expect(appState.providerId.value).toBe("openrouter");
    expect(appState.providerSettings.value.apiKeys).toEqual({ openrouter: "sk-or" });
  });
  it("carries over old single-provider settings", async () => {
    await chrome.storage.local.set({ provider: "gpt", apiKey: "" });
    const { obfuscate } = await import("@/lib/storage/obfuscate");
    await chrome.storage.local.set({ apiKey: obfuscate("sk-old") });
    const { hydrate, appState } = await import("./state");
    await hydrate();
    expect(appState.providerId.value).toBe("openai");
    expect(appState.providerSettings.value.apiKeys).toEqual({ openai: "sk-old" });
  });
});

describe("providerConfig", () => {
  it("resolves the current preset's connection", async () => {
    const { appState, providerConfig, currentAdapter } = await import("./state");
    appState.providerId.value = "deepseek";
    appState.providerSettings.value = { apiKeys: { deepseek: "k" }, baseUrls: {}, models: { deepseek: "deepseek-flash" } };
    expect(providerConfig()).toMatchObject({ label: "DeepSeek", baseUrl: "https://api.deepseek.com", apiKey: "k", model: "deepseek-flash" });
    expect(currentAdapter().id).toBe("openai-compat");
  });
});

describe("providerReady", () => {
  it("follows the preset's requirements", async () => {
    const { appState, providerReady } = await import("./state");
    appState.providerId.value = "claude";
    appState.providerSettings.value = { apiKeys: {}, baseUrls: {}, models: {} };
    expect(providerReady()).toBe(false);
    appState.providerSettings.value = { apiKeys: { claude: "k" }, baseUrls: {}, models: {} };
    expect(providerReady()).toBe(true);
    appState.providerId.value = "lmstudio";
    expect(providerReady()).toBe(false);
  });
});

describe("save actions", () => {
  it("scope keys, addresses and models to the current provider", async () => {
    const { appState, saveProvider, saveApiKey, saveBaseUrl, saveModel } = await import("./state");
    await saveProvider("vllm");
    await saveApiKey("vk");
    await saveBaseUrl("http://box:8000/v1");
    await saveModel("qwen");
    await saveProvider("groq");
    await saveApiKey("gk");
    expect(appState.providerSettings.value).toEqual({
      apiKeys: { vllm: "vk", groq: "gk" },
      baseUrls: { vllm: "http://box:8000/v1" },
      models: { vllm: "qwen" }
    });
    const { storage } = await import("@/lib/storage/storage");
    expect(await storage.getProviderSettings()).toEqual(appState.providerSettings.value);
  });
});

describe("provider access", () => {
  it("hydrate records whether the provider's host is granted", async () => {
    granted = false;
    const { hydrate, appState } = await import("./state");
    await hydrate();
    expect(appState.providerAccess.value).toBe(false);
  });
  it("blocks a model call with a clear message when access is missing", async () => {
    granted = false;
    const { appState, runAnalysis } = await import("./state");
    appState.providerId.value = "groq";
    appState.providerSettings.value = { apiKeys: { groq: "k" }, baseUrls: {}, models: { groq: "m" } };
    await runAnalysis("readme");
    expect(appState.status.value).toBe("Allow REACH to reach api.groq.com in Settings.");
    expect(appState.providerAccess.value).toBe(false);
  });
});
