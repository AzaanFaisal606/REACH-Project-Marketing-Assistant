import type { SubredditCandidate } from "./rank";
import type { ProjectSummary } from "@/lib/analysis/types";
import type { Provider, GenerateInput, ProviderConfig } from "@/lib/providers/types";
import { generate as defaultGenerate } from "@/lib/providers/types";
import { buildRerankPrompt } from "@/lib/prompts/rerank";

type GenFn = (provider: Provider, input: GenerateInput, config: ProviderConfig) => Promise<string>;

interface ScoredName {
  name: string;
  score: number;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseScores(raw: string): ScoredName[] {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("no JSON array");
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("not an array");
  return parsed
    .filter((x): x is ScoredName => !!x && typeof x.name === "string" && typeof x.score === "number");
}

/**
 * Phase 2: ask the BYOK model to re-rank the heuristic candidate pool by fit and
 * attach a 0-100 fitScore. The model only ever *reorders subs Reddit confirmed
 * exist* — invented names are dropped, omitted subs are kept (ranked after the
 * scored ones in their original order). Any failure falls back to the input
 * order unchanged, so this never blocks the flow.
 */
export async function rerankWithAI(
  summary: ProjectSummary,
  candidates: SubredditCandidate[],
  provider: Provider,
  config: ProviderConfig,
  gen: GenFn = defaultGenerate
): Promise<SubredditCandidate[]> {
  if (candidates.length === 0) return candidates;

  try {
    const { system, user } = buildRerankPrompt(summary, candidates);
    const raw = await gen(provider, { system, user }, config);
    const scores = parseScores(raw);

    const scoreByName = new Map<string, number>();
    for (const s of scores) {
      if (!scoreByName.has(s.name)) scoreByName.set(s.name, clamp(s.score));
    }

    const scored: SubredditCandidate[] = [];
    const unscored: SubredditCandidate[] = [];
    for (const c of candidates) {
      const fit = scoreByName.get(c.name);
      if (fit === undefined) unscored.push(c);
      else scored.push({ ...c, fitScore: fit });
    }
    scored.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));

    // Scored subs first (best fit), then any the model skipped, original order.
    return [...scored, ...unscored];
  } catch {
    return candidates; // graceful fallback — heuristic order stands
  }
}
