import { describe, it, expect, beforeEach, vi } from "vitest";
import { migrateLegacySettings } from "./migrate-legacy";
import { storage } from "./storage";
import { obfuscate } from "./obfuscate";

let data: Record<string, unknown>;
beforeEach(() => {
  data = {};
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]))),
        set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
        remove: vi.fn(async (k: string | string[]) => { for (const key of [k].flat()) delete data[key]; })
      }
    }
  };
});

describe("migrateLegacySettings", () => {
  it("carries old settings over once, then removes the old fields", async () => {
    data = { provider: "gpt", apiKey: obfuscate("sk-old"), ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "llama3", cloudModels: { gpt: "gpt-5.5" } };
    await migrateLegacySettings();
    await migrateLegacySettings();
    expect(await storage.getProvider()).toBe("openai");
    const s = await storage.getProviderSettings();
    expect(s.apiKeys).toEqual({ openai: "sk-old" });
    expect(s.baseUrls).toEqual({ ollama: "http://localhost:11434/v1" });
    expect(s.models).toEqual({ ollama: "llama3", openai: "gpt-5.5" });
    expect(Object.keys(data).sort()).toEqual(["apiKeys", "baseUrls", "models", "provider"]);
  });
  it("gives an old key with no saved provider to Claude", async () => {
    data = { apiKey: obfuscate("sk-ant") };
    await migrateLegacySettings();
    expect((await storage.getProviderSettings()).apiKeys).toEqual({ claude: "sk-ant" });
  });
  it("leaves an Ollama key out (Ollama takes none) and keeps an address that already ends in /v1", async () => {
    data = { provider: "ollama", apiKey: obfuscate("unused"), ollamaBaseUrl: "http://box:11434/v1/" };
    await migrateLegacySettings();
    const s = await storage.getProviderSettings();
    expect(s.apiKeys).toEqual({});
    expect(s.baseUrls).toEqual({ ollama: "http://box:11434/v1" });
  });
  it("does nothing on a fresh install", async () => {
    await migrateLegacySettings();
    expect(data).toEqual({});
  });
});
