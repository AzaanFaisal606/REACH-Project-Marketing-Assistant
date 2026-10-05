import { getPreset } from "@/lib/providers/presets";
import { storage } from "./storage";
import { deobfuscate } from "./obfuscate";

// One-shot carry-over from the old single-provider settings (pre universal
// providers). This is the only file that knows the old field names; the rest
// of storage has no legacy branches. Safe to run on every popup open: it does
// nothing once the old fields are gone.

const LEGACY = ["apiKey", "ollamaBaseUrl", "ollamaModel", "cloudModels"] as const;
const RENAMED: Record<string, string> = { gpt: "openai" };

export async function migrateLegacySettings(): Promise<void> {
  const old = await chrome.storage.local.get([...LEGACY, "provider"]);
  if (!LEGACY.some((k) => old[k] !== undefined)) return;

  const rawProvider = typeof old.provider === "string" ? old.provider : "";
  const provider = RENAMED[rawProvider] ?? rawProvider;
  if (rawProvider !== provider) await storage.setProvider(provider);

  // The old key belonged to whichever cloud provider was selected.
  const keyOwner = getPreset(provider) ? provider : "claude";
  if (typeof old.apiKey === "string" && old.apiKey && getPreset(keyOwner)?.key !== "none") {
    await storage.setApiKey(keyOwner, deobfuscate(old.apiKey));
  }

  if (typeof old.ollamaBaseUrl === "string" && old.ollamaBaseUrl) {
    const base = old.ollamaBaseUrl.trim().replace(/\/+$/, "");
    await storage.setBaseUrl("ollama", base.endsWith("/v1") ? base : `${base}/v1`);
  }
  if (typeof old.ollamaModel === "string" && old.ollamaModel) {
    await storage.setModel("ollama", old.ollamaModel);
  }
  for (const [id, model] of Object.entries((old.cloudModels ?? {}) as Record<string, string>)) {
    if (model) await storage.setModel(RENAMED[id] ?? id, model);
  }

  await chrome.storage.local.remove([...LEGACY]);
}
