import type { Provider, ProviderConfig } from "./types";
import { ADAPTERS } from "./adapters";
import { getPreset, type ProviderPreset } from "./presets";
import { isValidAddress } from "./permissions";

/** What the user has saved, per preset id. */
export interface ProviderSettings {
  apiKeys: Record<string, string>;
  baseUrls: Record<string, string>;
  models: Record<string, string>;
}

export interface Connection {
  adapter: Provider;
  config: ProviderConfig;
  preset: ProviderPreset;
}

/** Preset + saved settings → everything a request needs. */
export function resolveConnection(presetId: string, s: ProviderSettings): Connection {
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`Unknown provider "${presetId}".`);
  // People often paste the full endpoint; the adapter adds /chat/completions itself.
  const baseUrl = (s.baseUrls[presetId] || preset.baseUrl).trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
  const apiKey = preset.key === "none" ? undefined : s.apiKeys[presetId] || undefined;
  return {
    adapter: ADAPTERS[preset.adapter],
    preset,
    config: {
      label: preset.label,
      baseUrl,
      apiKey,
      model: s.models[presetId] || preset.defaultModel || "",
      headers: preset.headers,
      modelFilter: preset.modelFilter
    }
  };
}

/** True when the current settings are enough to make a request. */
export function isReady(presetId: string, s: ProviderSettings): boolean {
  if (!getPreset(presetId)) return false;
  const { preset, config } = resolveConnection(presetId, s);
  if (preset.key === "required" && !config.apiKey) return false;
  return isValidAddress(config.baseUrl) && !!config.model;
}
