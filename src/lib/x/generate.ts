import type { ProjectSummary } from "@/lib/analysis/types";
import type { Provider, ProviderConfig } from "@/lib/providers/types";
import { generate as defaultGenerate } from "@/lib/providers/types";
import {
  buildXHooksPrompt, buildXPrompt, buildXTweetRegenPrompt,
  type ToneProfile, type XFormat
} from "@/lib/prompts/x";

/** X's per-tweet character cap. Exported from this .ts (not the editor .tsx) so tests and the
 *  editor both import it without tripping the zimmerframe hook-names crash. */
export const TWEET_MAX = 280;

type GenFn = typeof defaultGenerate;

/** Strip code fences and slice to the outermost {...} before JSON.parse. Mirrors the
 *  LinkedIn/analysis parse approach. */
function parseObject<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export async function generateXHooks(
  summary: ProjectSummary, tone: ToneProfile, userPrompt: string,
  provider: Provider, config: ProviderConfig, gen: GenFn = defaultGenerate
): Promise<string[]> {
  const { system, user } = buildXHooksPrompt(summary, tone, userPrompt);
  const obj = parseObject<{ hooks?: string[] }>(await gen(provider, { system, user }, config));
  return Array.isArray(obj.hooks) ? obj.hooks.slice(0, 3) : [];
}

export async function generateXPostTweets(
  summary: ProjectSummary, format: XFormat, tone: ToneProfile, hashtags: string[],
  selectedHook: string, userPrompt: string,
  provider: Provider, config: ProviderConfig, gen: GenFn = defaultGenerate
): Promise<string[]> {
  const { system, user } = buildXPrompt(summary, format, tone, hashtags, selectedHook, userPrompt);
  const obj = parseObject<{ tweets?: string[] }>(await gen(provider, { system, user }, config));
  return Array.isArray(obj.tweets) ? obj.tweets : [];
}

export async function regenerateXTweet(
  summary: ProjectSummary, tone: ToneProfile, tweets: string[], index: number, userPrompt: string,
  provider: Provider, config: ProviderConfig, gen: GenFn = defaultGenerate
): Promise<string> {
  const { system, user } = buildXTweetRegenPrompt(summary, tone, tweets, index, userPrompt);
  const obj = parseObject<{ tweet?: string }>(await gen(provider, { system, user }, config));
  return obj.tweet ?? "";
}
