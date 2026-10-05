import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  const data: Record<string, unknown> = {};
  (globalThis as any).chrome = {
    storage: { local: {
      get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]))),
      set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
      remove: vi.fn(async (k: string | string[]) => { for (const key of [k].flat()) delete data[key]; })
    } },
    permissions: { contains: vi.fn(async () => true), request: vi.fn(async () => true) }
  };
  vi.resetModules();
  vi.unstubAllGlobals();
});

function modelsResponse(ids: string[]) {
  return new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), { status: 200 });
}

describe("loadModelList", () => {
  it("drops a saved model that's gone from that provider's list", async () => {
    const { appState } = await import("./state");
    const { loadModelList } = await import("./model-list");
    appState.providerId.value = "deepseek";
    appState.providerSettings.value = { apiKeys: { deepseek: "k" }, baseUrls: {}, models: { deepseek: "retired" } };
    vi.stubGlobal("fetch", vi.fn(async () => modelsResponse(["deepseek-chat"])));
    const res = await loadModelList("deepseek");
    expect(res.models.map((m) => m.id)).toEqual(["deepseek-chat"]);
    expect(appState.providerSettings.value.models.deepseek).toBeUndefined();
  });

  it("keeps the new provider's model when the user switches mid-load", async () => {
    const { appState } = await import("./state");
    const { loadModelList } = await import("./model-list");
    appState.providerId.value = "deepseek";
    appState.providerSettings.value = {
      apiKeys: { deepseek: "k", openai: "k2" }, baseUrls: {}, models: { openai: "gpt-5.4" }
    };
    let release!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => { release = r; })));
    const pending = loadModelList("deepseek");
    await vi.waitFor(() => expect(release).toBeDefined());
    appState.providerId.value = "openai"; // switched while DeepSeek's list was loading
    release(modelsResponse(["deepseek-chat"]));
    await pending;
    expect(appState.providerSettings.value.models.openai).toBe("gpt-5.4");
  });

  it("explains an address without http:// instead of checking access", async () => {
    const { appState } = await import("./state");
    const { loadModelList } = await import("./model-list");
    appState.providerId.value = "custom";
    appState.providerSettings.value = { apiKeys: {}, baseUrls: { custom: "localhost:1234/v1" }, models: {} };
    const res = await loadModelList("custom");
    expect(res).toEqual({ access: null, models: [], error: "Address must start with http:// or https://" });
    expect(chrome.permissions.contains).not.toHaveBeenCalled();
  });
});
