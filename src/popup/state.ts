import { signal } from "@preact/signals";
import { storage } from "@/lib/storage/storage";
import type { ProviderId, ProviderConfig } from "@/lib/providers/types";
import type { ProjectSummary } from "@/lib/analysis/types";
import { flattenFacets } from "@/lib/analysis/types";
import { getProvider } from "@/lib/providers";
import { generate } from "@/lib/providers/types";
import { analyze } from "@/lib/analysis/analyze";
import { searchSubreddits, RedditRateLimitError } from "@/lib/reddit/search";
import { rankSubreddits, type SubredditCandidate } from "@/lib/reddit/rank";
import { buildQueryPlan } from "@/lib/reddit/query-plan";
import { rerankWithAI } from "@/lib/reddit/rerank";
import { fetchSubredditRules, type SubredditRule } from "@/lib/reddit/rules";
import { restrictsSelfPromotion } from "@/lib/reddit/restrictions";
import { buildRedditPrompt } from "@/lib/prompts/reddit";
import { buildSubmitUrl } from "@/lib/reddit/submit-url";
import { generateLinkedInPost } from "@/lib/linkedin/generate";

export type TabId = "reddit" | "x" | "linkedin";

export const appState = {
  tab: signal<TabId>("reddit"),
  providerId: signal<ProviderId>("claude"),
  apiKey: signal<string>(""),
  ollamaBaseUrl: signal<string>("http://localhost:11434"),
  ollamaModel: signal<string>(""),
  summary: signal<ProjectSummary | null>(null),
  status: signal<string>(""),
  githubConnected: signal<boolean>(false)
};

/** Build the ProviderConfig for the currently selected provider.
 *  Cloud providers use apiKey; Ollama uses baseUrl + model. */
export function providerConfig(): ProviderConfig {
  if (appState.providerId.value === "ollama") {
    return { baseUrl: appState.ollamaBaseUrl.value, model: appState.ollamaModel.value };
  }
  return { apiKey: appState.apiKey.value };
}

/** True when the current provider has the minimum config to make a request. */
export function providerReady(): boolean {
  if (appState.providerId.value === "ollama") {
    return !!appState.ollamaModel.value && !!appState.ollamaBaseUrl.value;
  }
  return !!appState.apiKey.value;
}

export async function hydrate(): Promise<void> {
  const [provider, key, summary, githubToken, session, ollamaBaseUrl, ollamaModel, liDraft, liFounder] = await Promise.all([
    storage.getProvider(),
    storage.getApiKey(),
    storage.getSummary(),
    storage.getGithubToken(),
    storage.getRedditSession(),
    storage.getOllamaBaseUrl(),
    storage.getOllamaModel(),
    storage.getLinkedinDraft(),
    storage.getLinkedinFounderMode()
  ]);
  if (provider) appState.providerId.value = provider;
  appState.apiKey.value = key;
  appState.ollamaBaseUrl.value = ollamaBaseUrl;
  appState.ollamaModel.value = ollamaModel;
  appState.summary.value = summary ?? null;
  appState.githubConnected.value = !!githubToken; // persists across browser sessions

  // Resume an in-progress Reddit flow: communities found, sub picked, draft.
  if (session) {
    reddit.candidates.value = session.candidates;
    reddit.selected.value = session.selected;
    reddit.rules.value = session.rules;
    reddit.restrictsPromo.value = restrictsSelfPromotion(session.rules);
    if (session.selected) {
      const drafts = await storage.getDrafts();
      const existing = drafts[session.selected];
      reddit.draftTitle.value = existing?.title ?? "";
      reddit.draftBody.value = existing?.body ?? "";
    }
  }

  linkedin.draft.value = liDraft;
  linkedin.founderMode.value = liFounder;
}

export async function saveProvider(id: ProviderId): Promise<void> {
  appState.providerId.value = id;
  await storage.setProvider(id);
}
export async function saveApiKey(key: string): Promise<void> {
  appState.apiKey.value = key;
  await storage.setApiKey(key);
}
export async function saveOllamaBaseUrl(url: string): Promise<void> {
  appState.ollamaBaseUrl.value = url;
  await storage.setOllamaBaseUrl(url);
}
export async function saveOllamaModel(model: string): Promise<void> {
  appState.ollamaModel.value = model;
  await storage.setOllamaModel(model);
}
export async function saveSummary(s: ProjectSummary): Promise<void> {
  appState.summary.value = s;
  await storage.setSummary(s);
}

export const analyzing = signal<boolean>(false);

export async function runAnalysis(projectContext: string): Promise<void> {
  if (!providerReady()) {
    appState.status.value = appState.providerId.value === "ollama"
      ? "Set the Ollama server URL and pick a model in Settings first."
      : "Add your API key in Settings first.";
    return;
  }
  analyzing.value = true;
  appState.status.value = appState.providerId.value === "ollama"
    ? "Analyzing project… (first run may be slow while the model loads into VRAM)"
    : "Analyzing project…";
  try {
    const provider = getProvider(appState.providerId.value);
    const summary = await analyze(projectContext, provider, providerConfig(), generate);
    await saveSummary(summary);
    // New project → previous communities/selection/draft no longer apply.
    resetRedditFlow();
    resetLinkedinFlow();
    appState.status.value = "Analysis ready.";
  } catch (e) {
    appState.status.value = `Analysis failed: ${(e as Error).message}`;
  } finally {
    analyzing.value = false;
  }
}

export const reddit = {
  finding: signal<boolean>(false),
  reranking: signal<boolean>(false),
  candidates: signal<SubredditCandidate[]>([]),
  selected: signal<string | null>(null),
  rules: signal<SubredditRule[]>([]),
  restrictsPromo: signal<boolean>(false),
  generating: signal<boolean>(false),
  userPrompt: signal<string>(""),
  draftTitle: signal<string>(""),
  draftBody: signal<string>(""),
  error: signal<string>(""),
  rateLimited: signal<boolean>(false)
};

export const linkedin = {
  founderMode: signal<boolean>(false),
  userPrompt: signal<string>(""),
  draft: signal<string | null>(null),
  generating: signal<boolean>(false),
  error: signal<string>("")
};

// Heuristic pool fed to the AI re-ranker, and how many we ultimately show.
const POOL_SIZE = 30;
const DISPLAY_COUNT = 8;

// Persist the discover→pick state so reopening the popup resumes mid-flow
// (drafts persist separately under their own storage key).
function persistRedditSession(): void {
  void storage.setRedditSession({
    candidates: reddit.candidates.value,
    selected: reddit.selected.value,
    rules: reddit.rules.value
  });
}

function resetRedditFlow(): void {
  reddit.candidates.value = [];
  reddit.selected.value = null;
  reddit.rules.value = [];
  reddit.restrictsPromo.value = false;
  reddit.userPrompt.value = "";
  reddit.draftTitle.value = "";
  reddit.draftBody.value = "";
  reddit.error.value = "";
  void storage.clearRedditSession();
}

function resetLinkedinFlow(): void {
  linkedin.draft.value = null;
  linkedin.userPrompt.value = "";
  linkedin.error.value = "";
  void storage.clearLinkedinDraft();
}

// AI-refine the heuristic pool when a key is available. Never throws — rerank
// falls back to the heuristic order internally, so a failed/credit-less call
// just yields the unrefined list.
async function maybeRerank(
  summary: ProjectSummary,
  pool: SubredditCandidate[]
): Promise<SubredditCandidate[]> {
  if (!providerReady() || pool.length === 0) return pool;
  reddit.reranking.value = true;
  try {
    const provider = getProvider(appState.providerId.value);
    return await rerankWithAI(summary, pool, provider, providerConfig());
  } finally {
    reddit.reranking.value = false;
  }
}

export async function findCommunities(append = false): Promise<void> {
  const summary = appState.summary.value;
  if (!summary) { reddit.error.value = "Add a project first."; return; }
  reddit.finding.value = true;
  reddit.error.value = "";
  reddit.rateLimited.value = false;
  if (!append) {
    reddit.candidates.value = [];
    reddit.selected.value = null;
  }
  try {
    // Faceted query plan guarantees the geography axis gets searched (so a
    // regional project surfaces r/<place>, not just big topic subs).
    const raw = await searchSubreddits(buildQueryPlan(summary));
    const scoreKeywords = flattenFacets(summary);
    if (append) {
      // "Find more": heuristically rank the unseen pool, AI-refine the new
      // batch, then append.
      const seen = new Set(reddit.candidates.value.map((c) => c.name));
      const pool = rankSubreddits(raw.filter((c) => !seen.has(c.name)), scoreKeywords, summary.facets, POOL_SIZE);
      const fresh = (await maybeRerank(summary, pool)).slice(0, DISPLAY_COUNT);
      reddit.candidates.value = [...reddit.candidates.value, ...fresh];
      if (fresh.length === 0) reddit.error.value = "No more communities found.";
    } else {
      // Heuristic gets a wide pool; the AI re-ranks it for fit, then we show the best.
      const pool = rankSubreddits(raw, scoreKeywords, summary.facets, POOL_SIZE);
      const ranked = (await maybeRerank(summary, pool)).slice(0, DISPLAY_COUNT);
      reddit.candidates.value = ranked;
      if (ranked.length === 0) {
        reddit.error.value = "No strong matches — try editing the project description.";
      }
    }
    persistRedditSession();
  } catch (e) {
    if (e instanceof RedditRateLimitError) {
      reddit.rateLimited.value = true;
      reddit.error.value = "⏳ Reddit is rate-limiting requests — wait about a minute, then try again.";
    } else {
      reddit.error.value = (e as Error).message;
    }
  } finally {
    reddit.finding.value = false;
  }
}

export async function selectSubreddit(sub: string): Promise<void> {
  reddit.selected.value = sub;
  reddit.draftTitle.value = "";
  reddit.draftBody.value = "";
  reddit.rules.value = [];
  reddit.restrictsPromo.value = false;
  try {
    const rules = await fetchSubredditRules(sub);
    if (reddit.selected.value !== sub) return; // a newer selection superseded this one
    reddit.rules.value = rules;
    reddit.restrictsPromo.value = restrictsSelfPromotion(rules);
    const drafts = await storage.getDrafts();
    if (reddit.selected.value !== sub) return;
    const existing = drafts[sub];
    reddit.draftTitle.value = existing?.title ?? "";
    reddit.draftBody.value = existing?.body ?? "";
    persistRedditSession();
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
    const { system, user } = buildRedditPrompt(summary, sub, reddit.rules.value, reddit.userPrompt.value);
    const raw = await generate(provider, { system, user }, providerConfig());
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

export async function setFounderMode(on: boolean): Promise<void> {
  linkedin.founderMode.value = on;
  await storage.setLinkedinFounderMode(on);
}

export async function generateLinkedInPostAction(): Promise<void> {
  const summary = appState.summary.value;
  if (!summary) { linkedin.error.value = "Add a project first."; return; }
  if (!providerReady()) {
    linkedin.error.value = appState.providerId.value === "ollama"
      ? "Set the Ollama server URL and pick a model in Settings first."
      : "Add your API key in Settings first.";
    return;
  }
  linkedin.generating.value = true;
  linkedin.error.value = "";
  try {
    const provider = getProvider(appState.providerId.value);
    const post = await generateLinkedInPost(
      summary,
      linkedin.founderMode.value,
      linkedin.userPrompt.value,
      provider,
      providerConfig()
    );
    linkedin.draft.value = post;
    await storage.setLinkedinDraft(post);
  } catch (e) {
    linkedin.error.value = `Generation failed: ${(e as Error).message}`;
  } finally {
    linkedin.generating.value = false;
  }
}

export async function regenerateLinkedInPost(): Promise<void> {
  await generateLinkedInPostAction();
}
