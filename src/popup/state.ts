import { signal } from "@preact/signals";
import { storage } from "@/lib/storage/storage";
import type { ProviderId } from "@/lib/providers/types";
import type { ProjectSummary } from "@/lib/analysis/types";
import { getProvider } from "@/lib/providers";
import { generate } from "@/lib/providers/types";
import { analyze } from "@/lib/analysis/analyze";

export type TabId = "reddit" | "x" | "linkedin";

export const appState = {
  tab: signal<TabId>("reddit"),
  providerId: signal<ProviderId>("claude"),
  apiKey: signal<string>(""),
  summary: signal<ProjectSummary | null>(null),
  status: signal<string>("")
};

export async function hydrate(): Promise<void> {
  const [provider, key, summary] = await Promise.all([
    storage.getProvider(),
    storage.getApiKey(),
    storage.getSummary()
  ]);
  if (provider) appState.providerId.value = provider;
  appState.apiKey.value = key;
  appState.summary.value = summary ?? null;
}

export async function saveProvider(id: ProviderId): Promise<void> {
  appState.providerId.value = id;
  await storage.setProvider(id);
}
export async function saveApiKey(key: string): Promise<void> {
  appState.apiKey.value = key;
  await storage.setApiKey(key);
}
export async function saveSummary(s: ProjectSummary): Promise<void> {
  appState.summary.value = s;
  await storage.setSummary(s);
}

export const analyzing = signal<boolean>(false);

export async function runAnalysis(projectContext: string): Promise<void> {
  if (!appState.apiKey.value) {
    appState.status.value = "Add your API key in Settings first.";
    return;
  }
  analyzing.value = true;
  appState.status.value = "Analyzing project…";
  try {
    const provider = getProvider(appState.providerId.value);
    const summary = await analyze(projectContext, provider, appState.apiKey.value, generate);
    await saveSummary(summary);
    appState.status.value = "Analysis ready.";
  } catch (e) {
    appState.status.value = `Analysis failed: ${(e as Error).message}`;
  } finally {
    analyzing.value = false;
  }
}
