import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  const data: Record<string, unknown> = {};
  (globalThis as any).chrome = {
    storage: { local: {
      get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.map((k) => [k, data[k]]))),
      set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
      remove: vi.fn(async (k: string) => { delete data[k]; })
    } }
  };
  vi.resetModules();
});

describe("app store", () => {
  it("hydrates provider + key from storage", async () => {
    const { storage } = await import("@/lib/storage/storage");
    await storage.setProvider("gpt");
    await storage.setApiKey("sk-x");
    const { hydrate, appState } = await import("./state");
    await hydrate();
    expect(appState.providerId.value).toBe("gpt");
    expect(appState.apiKey.value).toBe("sk-x");
  });

  it("hydrates ollama baseUrl + model from storage", async () => {
    const { storage } = await import("@/lib/storage/storage");
    await storage.setProvider("ollama");
    await storage.setOllamaBaseUrl("http://localhost:9999");
    await storage.setOllamaModel("llama3");
    const { hydrate, appState } = await import("./state");
    await hydrate();
    expect(appState.providerId.value).toBe("ollama");
    expect(appState.ollamaBaseUrl.value).toBe("http://localhost:9999");
    expect(appState.ollamaModel.value).toBe("llama3");
  });
});

describe("providerConfig", () => {
  it("returns apiKey shape for cloud providers", async () => {
    const { appState, providerConfig } = await import("./state");
    appState.providerId.value = "claude";
    appState.apiKey.value = "sk-ant-test";
    expect(providerConfig()).toEqual({ apiKey: "sk-ant-test" });
  });

  it("returns baseUrl + model shape for ollama", async () => {
    const { appState, providerConfig } = await import("./state");
    appState.providerId.value = "ollama";
    appState.ollamaBaseUrl.value = "http://localhost:11434";
    appState.ollamaModel.value = "llama3";
    expect(providerConfig()).toEqual({ baseUrl: "http://localhost:11434", model: "llama3" });
  });
});

describe("providerReady", () => {
  it("is ready for cloud when apiKey is set", async () => {
    const { appState, providerReady } = await import("./state");
    appState.providerId.value = "gpt";
    appState.apiKey.value = "sk-test";
    expect(providerReady()).toBe(true);
  });

  it("is not ready for cloud when apiKey is empty", async () => {
    const { appState, providerReady } = await import("./state");
    appState.providerId.value = "claude";
    appState.apiKey.value = "";
    expect(providerReady()).toBe(false);
  });

  it("is ready for ollama when model is set", async () => {
    const { appState, providerReady } = await import("./state");
    appState.providerId.value = "ollama";
    appState.ollamaModel.value = "llama3";
    expect(providerReady()).toBe(true);
  });

  it("is not ready for ollama when model is empty", async () => {
    const { appState, providerReady } = await import("./state");
    appState.providerId.value = "ollama";
    appState.ollamaModel.value = "";
    expect(providerReady()).toBe(false);
  });

  it("is not ready for ollama when baseUrl is empty", async () => {
    const { appState, providerReady } = await import("./state");
    appState.providerId.value = "ollama";
    appState.ollamaModel.value = "llama3";
    appState.ollamaBaseUrl.value = "";
    expect(providerReady()).toBe(false);
  });
});
