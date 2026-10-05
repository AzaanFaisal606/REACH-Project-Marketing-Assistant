import { getPreset } from "@/lib/providers/presets";
import { storage } from "./storage";
import { deobfuscate } from "./obfuscate";

// One-shot carry-over from the old single-provider settings (pre universal
// providers). This is the only file that knows the old field names; the rest
// of storage has no legacy branches. Safe to run on every popup open: it does
// nothing once the old fields are gone.

const LEGACY = ["apiKey", "ollamaBaseUrl", "ollamaModel", "cloudModels"] as const;
const RENAMED: Record<string, string> = { gpt: "openai" };
// The old build had one key field shared by Claude, GPT and Gemini, so the key
// may not belong to whichever provider was selected last (e.g. Ollama).
const KEY_PREFIXES: [RegExp, string][] = [[/^sk-ant/, "claude"], [/^AIza/, "gemini"], [/^sk-/, "openai"]];

/** Where the old key goes, or undefined when there's no telling (unknown key, local provider). */
function keyOwner(key: string, provider: string): string | undefined {
  const byPrefix = KEY_PREFIXES.find(([re]) => re.test(key))?.[1];
  if (byPrefix) return byPrefix;
  if (!provider) return "claude"; // the old build's default
  return getPreset(provider)?.group === "cloud" ? provider : undefined;
}

export async function migrateLegacySettings(): Promise<void> {
  const old = await chrome.storage.local.get([...LEGACY, "provider"]);
  if (!LEGACY.some((k) => old[k] !== undefined)) return;

  const rawProvider = typeof old.provider === "string" ? old.provider : "";
  const provider = RENAMED[rawProvider] ?? rawProvider;
  if (rawProvider !== provider) await storage.setProvider(provider);

  if (typeof old.apiKey === "string" && old.apiKey) {
    // An undecodable key is skipped; throwing here would block every popup open.
    let key = "";
    try { key = deobfuscate(old.apiKey); } catch { /* unreadable, drop it */ }
    const owner = key && keyOwner(key, provider);
    if (owner) await storage.setApiKey(owner, key);
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
