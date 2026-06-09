import type { KeywordFacets } from "@/lib/analysis/types";

export interface SubredditCandidate {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  over18: boolean;
  /** 0-100 fit score from the optional AI re-rank (Phase 2). Absent when the
   *  heuristic ranking alone was used. */
  fitScore?: number;
}

const MIN_SUBSCRIBERS = 1000;
const W_OVERLAP = 10;
// Size matters far less than relevance — a huge generic sub buries your post,
// a smaller on-topic one actually sees it. Keep size as a gentle tiebreaker
// only (was 1.0; that let 10M-member subs dominate single-axis niche ones).
const W_SIZE = 0.4;
const TOP_N = 5;

// Word tokens shorter than this, plus these pure glue words, don't count toward
// overlap. We intentionally keep content-bearing tech words like "web"/"app" —
// those are often the user's actual keyword. Only ban words that carry no topic
// signal at all and would otherwise match nearly any sub's blurb.
const MIN_TOKEN_LEN = 3;
const STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "you", "are", "our",
  "this", "that", "from", "into", "via", "using", "based"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t));
}

// Count how many keyword WORD TOKENS appear in the sub's text. Multi-word
// keywords ("neural style transfer") are split into words so they still match a
// compressed sub name like r/neuralstyle ("neural" + "style") — a whole-phrase
// substring match never would. Each matching token counts once per keyword.
function keywordOverlap(c: SubredditCandidate, keywords: string[]): number {
  const hay = `${c.name} ${c.title} ${c.description}`.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    for (const token of tokenize(kw)) {
      if (hay.includes(token)) hits++;
    }
  }
  return hits;
}

function matchesGeography(c: SubredditCandidate, geo: string[]): boolean {
  const hay = `${c.name} ${c.title} ${c.description}`.toLowerCase();
  return geo.some((g) => {
    const k = g.toLowerCase().trim();
    return k.length > 0 && hay.includes(k);
  });
}

export function rankSubreddits(
  candidates: SubredditCandidate[],
  keywords: string[],
  facets?: KeywordFacets,
  limit: number = TOP_N
): SubredditCandidate[] {
  const scored = candidates
    .filter((c) => !c.over18 && c.subscribers >= MIN_SUBSCRIBERS)
    .map((c) => {
      const overlap = keywordOverlap(c, keywords);
      const score = overlap * W_OVERLAP + Math.log10(c.subscribers + 1) * W_SIZE;
      return { c, overlap, score };
    })
    .filter((x) => x.overlap > 0) // must match at least one keyword
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, limit).map((x) => x.c);

  // Diversity guarantee: if the project targets a place and some candidate
  // matches that geography but didn't make the cut, swap it in for the weakest
  // topic sub. This is what surfaces r/<place> for a regional project.
  const geo = facets?.geography ?? [];
  if (geo.length > 0 && !top.some((c) => matchesGeography(c, geo))) {
    const geoPick = scored.find((x) => matchesGeography(x.c, geo));
    if (geoPick && top.length >= limit) {
      top[top.length - 1] = geoPick.c; // replace the weakest with the geo match
    } else if (geoPick) {
      top.push(geoPick.c);
    }
  }

  return top;
}
