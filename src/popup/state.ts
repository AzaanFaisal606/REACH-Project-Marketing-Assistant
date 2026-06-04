import { signal } from "@preact/signals";
import { storage } from "@/lib/storage/storage";
import type { ProviderId } from "@/lib/providers/types";
import type { ProjectSummary } from "@/lib/analysis/types";
import { getProvider } from "@/lib/providers";
import { generate } from "@/lib/providers/types";
import { analyze } from "@/lib/analysis/analyze";
import { searchSubreddits } from "@/lib/reddit/search";
import { rankSubreddits, type SubredditCandidate } from "@/lib/reddit/rank";
import { fetchSubredditRules, type SubredditRule } from "@/lib/reddit/rules";
import { buildRedditPrompt } from "@/lib/prompts/reddit";
import { buildSubmitUrl } from "@/lib/reddit/submit-url";

export type TabId = "reddit" | "x" | "linkedin";

export const appState = {
  tab: signal<TabId>("reddit"),
  providerId: signal<ProviderId>("claude"),
  apiKey: signal<string>(""),
  summary: signal<ProjectSummary | null>(null),
  status: signal<string>(""),
  githubConnected: signal<boolean>(false)
};

export async function hydrate(): Promise<void> {
  const [provider, key, summary, githubToken] = await Promise.all([
    storage.getProvider(),
    storage.getApiKey(),
    storage.getSummary(),
    storage.getGithubToken()
  ]);
  if (provider) appState.providerId.value = provider;
  appState.apiKey.value = key;
  appState.summary.value = summary ?? null;
  appState.githubConnected.value = !!githubToken; // persists across browser sessions
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

export const reddit = {
  finding: signal<boolean>(false),
  candidates: signal<SubredditCandidate[]>([]),
  selected: signal<string | null>(null),
  rules: signal<SubredditRule[]>([]),
  generating: signal<boolean>(false),
  draftTitle: signal<string>(""),
  draftBody: signal<string>(""),
  error: signal<string>("")
};

export async function findCommunities(): Promise<void> {
  const summary = appState.summary.value;
  if (!summary) { reddit.error.value = "Add a project first."; return; }
  reddit.finding.value = true;
  reddit.error.value = "";
  reddit.candidates.value = [];
  reddit.selected.value = null;
  try {
    const raw = await searchSubreddits(summary.keywords);
    reddit.candidates.value = rankSubreddits(raw, summary.keywords);
    if (reddit.candidates.value.length === 0) {
      reddit.error.value = "No strong matches — try editing the project description.";
    }
  } catch (e) {
    reddit.error.value = (e as Error).message;
  } finally {
    reddit.finding.value = false;
  }
}

export async function selectSubreddit(sub: string): Promise<void> {
  reddit.selected.value = sub;
  reddit.draftTitle.value = "";
  reddit.draftBody.value = "";
  reddit.rules.value = [];
  try {
    const rules = await fetchSubredditRules(sub);
    if (reddit.selected.value !== sub) return; // a newer selection superseded this one
    reddit.rules.value = rules;
    const drafts = await storage.getDrafts();
    if (reddit.selected.value !== sub) return;
    const existing = drafts[sub];
    reddit.draftTitle.value = existing?.title ?? "";
    reddit.draftBody.value = existing?.body ?? "";
  } catch (e) {
    if (reddit.selected.value === sub) {
      reddit.error.value = `Could not load r/${sub}: ${(e as Error).message}`;
    }
  }
}

export async function generatePost(): Promise<void> {
  const summary = appState.summary.value;
  const sub = reddit.selected.value;
  if (!summary || !sub) return;
  reddit.generating.value = true;
  reddit.error.value = "";
  try {
    const provider = getProvider(appState.providerId.value);
    const { system, user } = buildRedditPrompt(summary, sub, reddit.rules.value);
    const raw = await generate(provider, { system, user }, appState.apiKey.value);
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const obj = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1)) as {
      title: string; body: string;
    };
    reddit.draftTitle.value = obj.title ?? "";
    reddit.draftBody.value = obj.body ?? "";
    await storage.setDraft(sub, { title: reddit.draftTitle.value, body: reddit.draftBody.value });
  } catch (e) {
    reddit.error.value = `Generation failed: ${(e as Error).message}`;
  } finally {
    reddit.generating.value = false;
  }
}

export async function regeneratePost(): Promise<void> {
  await generatePost();
}

export function openSubmit(): void {
  const sub = reddit.selected.value;
  if (!sub) return;
  try {
    const url = buildSubmitUrl(sub, reddit.draftTitle.value, reddit.draftBody.value);
    chrome.tabs.create({ url });
  } catch (e) {
    reddit.error.value = (e as Error).message;
  }
}

export async function connectGithub(): Promise<string> {
  const resp = (await chrome.runtime.sendMessage({ type: "github-oauth" })) as
    { ok: boolean; token?: string; error?: string };
  if (!resp?.ok || !resp.token) throw new Error(resp?.error ?? "GitHub connection failed.");
  await storage.setGithubToken(resp.token);
  appState.githubConnected.value = true;
  return resp.token;
}
