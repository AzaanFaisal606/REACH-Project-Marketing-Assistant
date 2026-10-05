import type { ModelOption } from "@/lib/providers/types";
import { resolveConnection } from "@/lib/providers/connection";
import { hasAccess, isValidAddress } from "@/lib/providers/permissions";
import { appState, saveModelFor } from "./state";

export interface ModelListState {
  /** null = no address to check yet. */
  access: boolean | null;
  models: ModelOption[];
  error: string;
}

/** Checks host access for one provider, then loads its model list if it can. */
export async function loadModelList(providerId: string): Promise<ModelListState> {
  const { adapter, config, preset } = resolveConnection(providerId, appState.providerSettings.value);
  if (!config.baseUrl) return { access: null, models: [], error: "" };
  if (!isValidAddress(config.baseUrl)) return { access: null, models: [], error: "Address must start with http:// or https://" };
  const access = await hasAccess(config.baseUrl);
  if (!access || (preset.key === "required" && !config.apiKey)) return { access, models: [], error: "" };
  try {
    const models = await adapter.listModels(config);
    // A saved model that's gone from the list (retired, or not on this key)
    // would only fail at generate time, so drop it. Read and clear by
    // providerId, not the current provider: the user may have switched meanwhile.
    const saved = appState.providerSettings.value.models[providerId];
    if (saved && models.length > 0 && !models.some((m) => m.id === saved)) await saveModelFor(providerId, "");
    return { access, models, error: "" };
  } catch (e) {
    return { access, models: [], error: (e as Error).message };
  }
}
