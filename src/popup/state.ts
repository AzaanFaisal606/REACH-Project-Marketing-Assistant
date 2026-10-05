import { signal } from "@preact/signals";
import { storage } from "@/lib/storage/storage";
import type { Provider, ProviderConfig } from "@/lib/providers/types";
import type { ProjectSummary } from "@/lib/analysis/types";
import { flattenFacets } from "@/lib/analysis/types";
import { DEFAULT_PRESET_ID, type ProviderPreset } from "@/lib/providers/presets";
import { resolveConnection, isReady, type ProviderSettings } from "@/lib/providers/connection";
import { hasAccess, hostOf } from "@/lib/providers/permissions";
import { migrateLegacySettings } from "@/lib/storage/migrate-legacy";
import { generate } from "@/lib/providers/types";
import { analyze } from "@/lib/analysis/analyze";
import { searchSubreddits } from "@/lib/reddit/search";
import { rankSubreddits, type SubredditCandidate } from "@/lib/reddit/rank";
import { buildQueryPlan } from "@/lib/reddit/query-plan";
import { rerankWithAI } from "@/lib/reddit/rerank";
import { fetchSubredditRules, type SubredditRule } from "@/lib/reddit/rules";
import { restrictsSelfPromotion } from "@/lib/reddit/restrictions";
import { buildRedditPrompt } from "@/lib/prompts/reddit";
import { buildSubmitUrl } from "@/lib/reddit/submit-url";
import { generateLinkedInPost } from "@/lib/linkedin/generate";
import { generateXHooks, generateXPostTweets, regenerateXTweet } from "@/lib/x/generate";
import { filterHashtags } from "@/lib/x/hashtags";
import type { ToneProfile, XFormat } from "@/lib/prompts/x";

export type TabId = "reddit" | "x" | "linkedin";
export type { ToneProfile, XFormat } from "@/lib/prompts/x";

export const appState = {
  tab: signal<TabId>("reddit"),
  /** Preset id from src/lib/providers/presets.ts. */
  providerId: signal<string>(DEFAULT_PRESET_ID),
  /** Keys, addresses and models saved per preset id. */
  providerSettings: signal<ProviderSettings>({ apiKeys: {}, baseUrls: {}, models: {} }),
  summary: signal<ProjectSummary | null>(null),
  status: signal<string>(""),
  githubConnected: signal<boolean>(false)
};

function connection() {
  return resolveConnection(appState.providerId.value, appState.providerSettings.value);
}
/** Request settings for the selected provider. */
export function providerConfig(): ProviderConfig {
  return connection().config;
}
export function currentAdapter(): Provider {
  return connection().adapter;
}
export function currentPreset(): ProviderPreset {
  return connection().preset;
}

/** True when the selected provider has everything a request needs. */
export function providerReady(): boolean {
  return isReady(appState.providerId.value, appState.providerSettings.value);
}

const NOT_READY = "Set up your AI provider in Settings first.";

/** Why a model call can't run right now, or null when it can. */
async function providerPreflight(): Promise<string | null> {
  if (!providerReady()) return NOT_READY;
  const { baseUrl } = providerConfig();
  if (!(await hasAccess(baseUrl))) return `Allow REACH to reach ${hostOf(baseUrl)} in Settings.`;
  return null;
}

/** Checks the provider's host permission; on failure explains it in the status line. */
export async function ensureProviderAccess(): Promise<boolean> {
  const { baseUrl } = providerConfig();
  if (await hasAccess(baseUrl)) return true;
  appState.status.value = `Allow REACH to reach ${hostOf(baseUrl)} in Settings.`;
  return false;
}

export async function hydrate(): Promise<void> {
  await migrateLegacySettings();
  const [provider, providerSettings, summary, githubToken, session, liDraft, liFounder, xTone, xFormatMode, xSession] = await Promise.all([
    storage.getProvider(),
    storage.getProviderSettings(),
    storage.getSummary(),
    storage.getGithubToken(),
    storage.getRedditSession(),
    storage.getLinkedinDraft(),
    storage.getLinkedinFounderMode(),
    storage.getXToneProfile(),
    storage.getXFormatMode(),
    storage.getXSession()
  ]);
  if (provider) appState.providerId.value = provider;
  appState.providerSettings.value = providerSettings;
  appState.summary.value = summary ?? null;
  appState.githubConnected.value = !!githubToken; // persists across browser sessions

  // Resume an in-progress Reddit flow: communities found, sub picked, draft.
  if (session) {
    reddit.candidates.value = session.candidates;
    reddit.selected.value = session.selected;
    reddit.rules.value = session.rules;
    reddit.restrictsPromo.value = restrictsSelfPromotion(session.rules);
    // Load the draft for the resumed context — the selected sub, or the general
    // no-sub draft when nothing is highlighted.
    await loadDraftFor(session.selected);
  }

  linkedin.draft.value = liDraft;
  linkedin.founderMode.value = liFounder;

  x.toneProfile.value = xTone;
  x.format.value = xFormatMode;
  if (xSession) {
    x.hooks.value = xSession.hooks;
    x.selectedHook.value = xSession.selectedHook;
    x.draft.value = xSession.draft;
  }
}

export async function saveProvider(id: string): Promise<void> {
  appState.providerId.value = id;
  await storage.setProvider(id);
}

type SettingsMap = keyof ProviderSettings;
/** Update one per-provider entry; an empty value removes it. */
function setEntry(map: SettingsMap, id: string, value: string): void {
  const next = { ...appState.providerSettings.value[map] };
  if (value) next[id] = value;
  else delete next[id];
  appState.providerSettings.value = { ...appState.providerSettings.value, [map]: next };
}
export async function saveApiKey(key: string): Promise<void> {
  setEntry("apiKeys", appState.providerId.value, key);
  await storage.setApiKey(appState.providerId.value, key);
}
export async function saveBaseUrl(url: string): Promise<void> {
  setEntry("baseUrls", appState.providerId.value, url);
  await storage.setBaseUrl(appState.providerId.value, url);
}
export async function saveModel(model: string): Promise<void> {
  await saveModelFor(appState.providerId.value, model);
}
/** For async work that started under one provider and may finish after a switch. */
export async function saveModelFor(id: string, model: string): Promise<void> {
  setEntry("models", id, model);
  await storage.setModel(id, model);
}
export async function saveSummary(s: ProjectSummary): Promise<void> {
  appState.summary.value = s;
  await storage.setSummary(s);
}

export const analyzing = signal<boolean>(false);

export async function runAnalysis(projectContext: string): Promise<void> {
  const blocked = await providerPreflight();
  if (blocked) { appState.status.value = blocked; return; }
  analyzing.value = true;
  appState.status.value = currentPreset().group === "cloud"
    ? "Analyzing project…"
    : "Analyzing project… (the first run can be slow while the model loads)";
  try {
    const summary = await analyze(projectContext, currentAdapter(), providerConfig(), generate);
    await saveSummary(summary);
    // New project → previous communities/selection/draft no longer apply.
    resetRedditFlow();
    resetLinkedinFlow();
    resetXFlow();
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
  error: signal<string>("")
};

export const linkedin = {
  founderMode: signal<boolean>(false),
  userPrompt: signal<string>(""),
  draft: signal<string | null>(null),
  generating: signal<boolean>(false),
  error: signal<string>("")
};

export const x = {
  toneProfile: signal<ToneProfile>("buildinpublic"),
  format: signal<'auto' | XFormat>("auto"),
  userPrompt: signal<string>(""),
  hooks: signal<string[] | null>(null),
  selectedHook: signal<string | null>(null),
  draft: signal<string[] | null>(null),
  generating: signal<boolean>(false),
  hooksLoading: signal<boolean>(false),
  regenIndex: signal<number | null>(null),
  error: signal<string>("")
};

/** The format generation/UI acts on: 'auto' resolves to the analysis baseline (default 'thread'). */
export function effectiveXFormat(): XFormat {
  if (x.format.value === "tweet" || x.format.value === "thread") return x.format.value;
  return appState.summary.value?.xFormat ?? "thread";
}

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

function persistXSession(): void {
  void storage.setXSession({
    hooks: x.hooks.value,
    selectedHook: x.selectedHook.value,
    draft: x.draft.value
  });
}

function resetXFlow(): void {
  x.hooks.value = null;
  x.selectedHook.value = null;
  x.draft.value = null;
  x.userPrompt.value = "";
  x.error.value = "";
  x.regenIndex.value = null;
  void storage.clearXSession();
}

// AI-refine the heuristic pool when a key is available. Never throws — rerank
// falls back to the heuristic order internally, so a failed/credit-less call
// just yields the unrefined list.
async function maybeRerank(
  summary: ProjectSummary,
  pool: SubredditCandidate[]
): Promise<SubredditCandidate[]> {
  // Re-ranking is an optional refinement: skip it quietly if the model can't be called.
  if (pool.length === 0 || (await providerPreflight())) return pool;
  reddit.reranking.value = true;
  try {
    return await rerankWithAI(summary, pool, currentAdapter(), providerConfig());
  } finally {
    reddit.reranking.value = false;
  }
}

export async function findCommunities(append = false): Promise<void> {
  const summary = appState.summary.value;
  if (!summary) { reddit.error.value = "Add a project first."; return; }
  reddit.finding.value = true;
  reddit.error.value = "";
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
    reddit.error.value = (e as Error).message;
  } finally {
    reddit.finding.value = false;
  }
}

// Storage key for the draft generated with NO subreddit selected. A real sub
// name can never collide with this (Reddit names are [A-Za-z0-9_], no double
// underscores at the ends by convention, and this is bracketed).
const GENERAL_DRAFT_KEY = "__general__";

// Load the saved draft for a given context (a subreddit, or null = the general
// no-sub draft) into the editor signals. Each context has its own draft.
async function loadDraftFor(sub: string | null): Promise<void> {
  const drafts = await storage.getDrafts();
  const existing = drafts[sub ?? GENERAL_DRAFT_KEY];
  reddit.draftTitle.value = existing?.title ?? "";
  reddit.draftBody.value = existing?.body ?? "";
}

// Clicking a subreddit selects it; clicking the already-selected one toggles
// back to the no-sub (general) context. Selection drives whether sub name +
// rules get attached to the generated post.
export async function selectSubreddit(sub: string): Promise<void> {
  // Toggle off: deselect and fall back to the general draft context.
  if (reddit.selected.value === sub) {
    reddit.selected.value = null;
    reddit.rules.value = [];
    reddit.restrictsPromo.value = false;
    await loadDraftFor(null);
    persistRedditSession();
    return;
  }

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
    if (reddit.selected.value !== sub) return;
    await loadDraftFor(sub);
    persistRedditSession();
  } catch (e) {
    if (reddit.selected.value === sub) {
      reddit.error.value = `Could not load r/${sub}: ${(e as Error).message}`;
    }
  }
}

export async function generatePost(): Promise<void> {
  const summary = appState.summary.value;
  if (!summary) return;
  // sub may be null → a generic post with no target community / rules attached.
  const sub = reddit.selected.value;
  const blocked = await providerPreflight();
  if (blocked) { reddit.error.value = blocked; return; }
  reddit.generating.value = true;
  reddit.error.value = "";
  try {
    const { system, user } = buildRedditPrompt(summary, sub, reddit.rules.value, reddit.userPrompt.value);
    const raw = await generate(currentAdapter(), { system, user }, providerConfig());
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const obj = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1)) as {
      title: string; body: string;
    };
    reddit.draftTitle.value = obj.title ?? "";
    reddit.draftBody.value = obj.body ?? "";
    await storage.setDraft(sub ?? GENERAL_DRAFT_KEY, { title: reddit.draftTitle.value, body: reddit.draftBody.value });
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
  // sub may be null → buildSubmitUrl opens Reddit's generic submit page.
  const sub = reddit.selected.value;
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
  const blocked = await providerPreflight();
  if (blocked) { linkedin.error.value = blocked; return; }
  linkedin.generating.value = true;
  linkedin.error.value = "";
  try {
    const post = await generateLinkedInPost(
      summary,
      linkedin.founderMode.value,
      linkedin.userPrompt.value,
      currentAdapter(),
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

export async function setXToneProfile(p: ToneProfile): Promise<void> {
  x.toneProfile.value = p;
  await storage.setXToneProfile(p);
}

export async function setXFormatMode(m: 'auto' | XFormat): Promise<void> {
  // Changing the format invalidates any hooks/draft produced for the old format.
  x.format.value = m;
  x.hooks.value = null;
  x.selectedHook.value = null;
  x.draft.value = null;
  x.error.value = "";
  void storage.clearXSession();
  await storage.setXFormatMode(m);
}

async function xPreflightError(): Promise<string | null> {
  if (!appState.summary.value) return "Add a project first.";
  return providerPreflight();
}

export async function generateXHooksAction(): Promise<void> {
  const err = await xPreflightError();
  if (err) { x.error.value = err; return; }
  const summary = appState.summary.value!;
  x.hooksLoading.value = true;
  x.error.value = "";
  try {
    const hooks = await generateXHooks(summary, x.toneProfile.value, x.userPrompt.value, currentAdapter(), providerConfig());
    x.hooks.value = hooks;
    x.selectedHook.value = null;
    persistXSession();
    if (hooks.length === 0) x.error.value = "No hooks returned — try regenerating.";
  } catch (e) {
    x.error.value = `Hook generation failed: ${(e as Error).message}`;
  } finally {
    x.hooksLoading.value = false;
  }
}

export function selectHook(hook: string): void {
  x.selectedHook.value = hook;
  persistXSession();
}

export async function generateXPost(): Promise<void> {
  const err = await xPreflightError();
  if (err) { x.error.value = err; return; }
  const summary = appState.summary.value!;
  const format = effectiveXFormat();
  if (format === "thread" && !x.selectedHook.value) {
    x.error.value = "Pick a hook first.";
    return;
  }
  x.generating.value = true;
  x.error.value = "";
  try {
    const hashtags = filterHashtags(summary);
    const tweets = await generateXPostTweets(
      summary, format, x.toneProfile.value, hashtags,
      x.selectedHook.value ?? "", x.userPrompt.value,
      currentAdapter(), providerConfig()
    );
    x.draft.value = tweets;
    persistXSession();
    if (tweets.length === 0) x.error.value = "No tweets returned — try regenerating.";
  } catch (e) {
    x.error.value = `Generation failed: ${(e as Error).message}`;
  } finally {
    x.generating.value = false;
  }
}

export async function regenerateXPost(): Promise<void> {
  await generateXPost();
}

export async function regenerateTweet(index: number): Promise<void> {
  const summary = appState.summary.value;
  const tweets = x.draft.value;
  if (!summary || !tweets || index < 0 || index >= tweets.length) return;
  const blocked = await providerPreflight();
  if (blocked) { x.error.value = blocked; return; }
  x.regenIndex.value = index;
  x.error.value = "";
  try {
    const replacement = await regenerateXTweet(
      summary, x.toneProfile.value, tweets, index, x.userPrompt.value, currentAdapter(), providerConfig()
    );
    if (replacement) {
      if (x.draft.value !== tweets) return; // a newer draft superseded this one mid-flight
      const next = tweets.slice();
      next[index] = replacement;
      x.draft.value = next;
      persistXSession();
    }
  } catch (e) {
    x.error.value = `Tweet regeneration failed: ${(e as Error).message}`;
  } finally {
    x.regenIndex.value = null;
  }
}
