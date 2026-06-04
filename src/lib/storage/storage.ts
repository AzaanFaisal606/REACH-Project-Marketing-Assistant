import { obfuscate, deobfuscate } from "./obfuscate";
import type { ProviderId } from "@/lib/providers/types";
import type { ProjectSummary } from "@/lib/analysis/types";
import type { SubredditCandidate } from "@/lib/reddit/rank";
import type { SubredditRule } from "@/lib/reddit/rules";

export interface RedditSession {
  candidates: SubredditCandidate[];
  selected: string | null;
  rules: SubredditRule[];
}

const VALID_PROVIDERS = ["claude", "gpt", "gemini"] as const;

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
  apiKey: "apiKey",
  provider: "provider",
  summary: "summary",
  drafts: "drafts",
  githubToken: "githubToken",
  redditSession: "redditSession"
} as const;

async function getRaw<T>(key: string): Promise<T | undefined> {
  const res = await chrome.storage.local.get([key]);
  return res[key] as T | undefined;
}
async function setRaw(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export const storage = {
  async getApiKey(): Promise<string> {
    return deobfuscate((await getRaw<string>(KEYS.apiKey)) ?? "");
  },
  async setApiKey(key: string): Promise<void> {
    await setRaw(KEYS.apiKey, obfuscate(key));
  },
  async getProvider(): Promise<ProviderId | undefined> {
    const raw = await getRaw<string>(KEYS.provider);
    return (VALID_PROVIDERS as readonly string[]).includes(raw ?? "")
      ? (raw as ProviderId)
      : undefined;
  },
  async setProvider(id: ProviderId): Promise<void> {
    await setRaw(KEYS.provider, id);
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
  }
};
