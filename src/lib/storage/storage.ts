import { obfuscate, deobfuscate } from "./obfuscate";
import { getPreset } from "@/lib/providers/presets";
import type { ProviderSettings } from "@/lib/providers/connection";
import type { ProjectSummary } from "@/lib/analysis/types";
import type { SubredditCandidate } from "@/lib/reddit/rank";
import type { SubredditRule } from "@/lib/reddit/rules";
import type { ToneProfile, XFormat } from "@/lib/prompts/x";

export interface RedditSession {
  candidates: SubredditCandidate[];
  selected: string | null;
  rules: SubredditRule[];
}

export interface XSession {
  hooks: string[] | null;
  selectedHook: string | null;
  draft: string[] | null;
}

const VALID_TONE_PROFILES = ["buildinpublic", "datadriven", "technical", "hottake"] as const;

// NOTE: a fuller isProjectSummary predicate will be added to src/lib/analysis/types.ts in a later task;
// this local check is intentional for now to avoid a forward dependency.
function looksLikeSummary(v: unknown): v is ProjectSummary {
  const o = v as Record<string, unknown> | null;
  return !!o && typeof o === "object"
    && typeof o.valueProp === "string"
    && typeof o.targetUser === "string"
    && Array.isArray(o.keyFeatures)
    && typeof o.tone === "string"
    && Array.isArray(o.keywords);
}

const KEYS = {
  provider: "provider",
  apiKeys: "apiKeys",
  baseUrls: "baseUrls",
  models: "models",
  summary: "summary",
  drafts: "drafts",
  githubToken: "githubToken",
  redditSession: "redditSession",
  linkedinDraft: "linkedinDraft",
  linkedinFounderMode: "linkedinFounderMode",
  xToneProfile: "xToneProfile",
  xFormatMode: "xFormatMode",
  xSession: "xSession"
} as const;

async function getRaw<T>(key: string): Promise<T | undefined> {
  const res = await chrome.storage.local.get([key]);
  return res[key] as T | undefined;
}
async function setRaw(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/** Set one entry of a per-provider map; an empty value removes it. */
async function setEntry(mapKey: string, id: string, value: string): Promise<void> {
  const map = (await getRaw<Record<string, string>>(mapKey)) ?? {};
  if (value) map[id] = value;
  else delete map[id];
  await setRaw(mapKey, map);
}

export const storage = {
  async getProvider(): Promise<string | undefined> {
    const raw = await getRaw<string>(KEYS.provider);
    return raw && getPreset(raw) ? raw : undefined;
  },
  async setProvider(id: string): Promise<void> {
    await setRaw(KEYS.provider, id);
  },
  /** Keys, addresses and models saved per provider (keys deobfuscated). */
  async getProviderSettings(): Promise<ProviderSettings> {
    const [keys, baseUrls, models] = await Promise.all([
      getRaw<Record<string, string>>(KEYS.apiKeys),
      getRaw<Record<string, string>>(KEYS.baseUrls),
      getRaw<Record<string, string>>(KEYS.models)
    ]);
    const apiKeys = Object.fromEntries(Object.entries(keys ?? {}).map(([id, k]) => [id, deobfuscate(k)]));
    return { apiKeys, baseUrls: baseUrls ?? {}, models: models ?? {} };
  },
  async setApiKey(id: string, key: string): Promise<void> {
    await setEntry(KEYS.apiKeys, id, key && obfuscate(key));
  },
  async setBaseUrl(id: string, url: string): Promise<void> {
    await setEntry(KEYS.baseUrls, id, url);
  },
  async setModel(id: string, model: string): Promise<void> {
    await setEntry(KEYS.models, id, model);
  },
  async getSummary(): Promise<ProjectSummary | undefined> {
    const raw = await getRaw<unknown>(KEYS.summary);
    return looksLikeSummary(raw) ? raw : undefined;
  },
  async setSummary(s: ProjectSummary): Promise<void> {
    await setRaw(KEYS.summary, s);
  },
  async getDrafts(): Promise<Record<string, { title: string; body: string }>> {
    return (await getRaw<Record<string, { title: string; body: string }>>(KEYS.drafts)) ?? {};
  },
  async setDraft(sub: string, draft: { title: string; body: string }): Promise<void> {
    const all = await this.getDrafts();
    all[sub] = draft;
    await setRaw(KEYS.drafts, all);
  },
  async getGithubToken(): Promise<string> {
    return deobfuscate((await getRaw<string>(KEYS.githubToken)) ?? "");
  },
  async setGithubToken(token: string): Promise<void> {
    await setRaw(KEYS.githubToken, obfuscate(token));
  },
  async getRedditSession(): Promise<RedditSession | null> {
    return (await getRaw<RedditSession>(KEYS.redditSession)) ?? null;
  },
  async setRedditSession(session: RedditSession): Promise<void> {
    await setRaw(KEYS.redditSession, session);
  },
  async clearRedditSession(): Promise<void> {
    await chrome.storage.local.remove(KEYS.redditSession);
  },
  async getLinkedinDraft(): Promise<string | null> {
    return (await getRaw<string>(KEYS.linkedinDraft)) ?? null;
  },
  async setLinkedinDraft(post: string): Promise<void> {
    await setRaw(KEYS.linkedinDraft, post);
  },
  async clearLinkedinDraft(): Promise<void> {
    await chrome.storage.local.remove(KEYS.linkedinDraft);
  },
  async getLinkedinFounderMode(): Promise<boolean> {
    return (await getRaw<boolean>(KEYS.linkedinFounderMode)) ?? false;
  },
  async setLinkedinFounderMode(on: boolean): Promise<void> {
    await setRaw(KEYS.linkedinFounderMode, on);
  },
  async getXToneProfile(): Promise<ToneProfile> {
    const raw = await getRaw<string>(KEYS.xToneProfile);
    return (VALID_TONE_PROFILES as readonly string[]).includes(raw ?? "")
      ? (raw as ToneProfile)
      : "buildinpublic";
  },
  async setXToneProfile(p: ToneProfile): Promise<void> {
    await setRaw(KEYS.xToneProfile, p);
  },
  async getXFormatMode(): Promise<'auto' | XFormat> {
    const raw = await getRaw<string>(KEYS.xFormatMode);
    return raw === "tweet" || raw === "thread" ? raw : "auto";
  },
  async setXFormatMode(m: 'auto' | XFormat): Promise<void> {
    await setRaw(KEYS.xFormatMode, m);
  },
  async getXSession(): Promise<XSession | null> {
    return (await getRaw<XSession>(KEYS.xSession)) ?? null;
  },
  async setXSession(s: XSession): Promise<void> {
    await setRaw(KEYS.xSession, s);
  },
  async clearXSession(): Promise<void> {
    await chrome.storage.local.remove(KEYS.xSession);
  }
};
