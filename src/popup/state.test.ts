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
});
