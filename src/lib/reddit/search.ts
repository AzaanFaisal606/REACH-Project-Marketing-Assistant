import type { SubredditCandidate } from "./rank";
import dataset from "./data/subreddits.json";

// OFFLINE COMMUNITY SEARCH.
//
// Reddit disabled unauthenticated .json endpoints (403 as of May 2026), so the
// old live keyword search (reddit.com/subreddits/search.json) no longer works
// on machines without a trusted, logged-in reddit.com session. We now search a
// bundled snapshot instead (src/lib/reddit/data/subreddits.json, built by
// scripts/build-subreddit-dataset.mjs). Same signature as before —
// searchSubreddits(keywords) -> candidates — so ranking and callers are
// unchanged; only the candidate SOURCE moved from network to local.
//
// The old code delegated relevance to Reddit's server-side search. We can't; a
// naive `description.includes(token)` substring scan is far too loose — the
// token "style" matches r/lifestyle, "learning" matches half of Reddit — and
// because the dataset is sorted by size, the first N substring hits are just the
// biggest generic subs. So we do proper WORD-BOUNDARY matching and RELEVANCE
// SCORING here, weighting a hit in the sub's name/title far above its
// description, and return the best-scoring subs. rankSubreddits() then applies
// its own scoring on this already-relevant pool.

interface RawSub {
  name: string;
  title: string;
  description: string;
  subscribers: number;
}

const SUBS = dataset as RawSub[];

// Kept for API compatibility: state.ts imports this to detect Reddit throttling.
// The offline path can't be rate-limited, but the type must still exist so the
// `instanceof` check in findCommunities keeps compiling. It's simply never
// thrown now.
export class RedditRateLimitError extends Error {}

const MAX_KEYWORD_QUERIES = 6;
// Return a pool wide enough for rankSubreddits + the AI rerank to pick a good
// top-N, but only of subs that actually matched a keyword TOKEN by word.
const POOL_LIMIT = 60;

// Same tokenizer as rank.ts: split on non-alphanumerics, drop short/glue tokens.
const MIN_TOKEN_LEN = 3;
const STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "you", "are", "our",
  "this", "that", "from", "into", "via", "using", "based",
  // Generic tech/marketing words that match thousands of unrelated subs and
  // carry no community-targeting signal on their own.
  "app", "web", "online", "free", "new", "best", "tool", "tools"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t));
}

// Whole-word (token) presence, not substring: "style" must appear as its own
// word, so it matches "neural style transfer" but NOT "lifestyle"/"hairstyle".
// Text is split into a Set of word tokens once per field for O(1) lookups.
function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

// Precompute each sub's tokenized name/title/description ONCE. The dataset is
// ~30k rows; doing this per-search-per-keyword would be wasteful.
interface IndexedSub {
  sub: RawSub;
  nameWords: Set<string>;
  titleWords: Set<string>;
  descWords: Set<string>;
}

const INDEX: IndexedSub[] = SUBS.map((sub) => ({
  sub,
  nameWords: wordSet(sub.name),
  titleWords: wordSet(sub.title),
  descWords: wordSet(sub.description)
}));

// Relevance weights: a keyword landing in the sub's NAME is a much stronger
// signal than in its blurb. This is what keeps r/MachineLearning above
// r/malefashionadvice for an ML project — the token "learning"/"machine" hits
// the name, not just some word buried in a fashion sub's description.
const W_NAME = 6;
const W_TITLE = 3;
const W_DESC = 1;

function relevance(item: IndexedSub, tokens: string[]): number {
  let score = 0;
  for (const t of tokens) {
    if (item.nameWords.has(t)) score += W_NAME;
    else if (item.titleWords.has(t)) score += W_TITLE;
    else if (item.descWords.has(t)) score += W_DESC;
  }
  return score;
}

function toCandidate(s: RawSub): SubredditCandidate {
  // The dataset is pre-filtered to public, non-NSFW, >=1000-sub communities, so
  // over18 is always false here. rankSubreddits still re-applies its own filters,
  // which is a harmless no-op on this set.
  return {
    name: s.name,
    title: s.title,
    description: s.description,
    subscribers: s.subscribers,
    over18: false
  };
}

// Synchronous under the hood, but kept async to preserve the call site
// (`await searchSubreddits(...)`) and signature exactly.
export async function searchSubreddits(keywords: string[]): Promise<SubredditCandidate[]> {
  const queries = keywords.map((k) => k.trim()).filter(Boolean).slice(0, MAX_KEYWORD_QUERIES);
  if (queries.length === 0) return [];

  // Union all query tokens; score every sub once against the whole set. This
  // beats per-keyword quotas (which filled up with big generic subs before ever
  // reaching a relevant mid-size one).
  const tokens = [...new Set(queries.flatMap(tokenize))];
  if (tokens.length === 0) return [];

  const scored: { item: IndexedSub; score: number }[] = [];
  for (const item of INDEX) {
    const score = relevance(item, tokens);
    if (score > 0) scored.push({ item, score });
  }

  // Best relevance first; subscribers as a gentle tiebreaker so among equally
  // on-topic subs the more active one wins.
  scored.sort((a, b) =>
    b.score - a.score || b.item.sub.subscribers - a.item.sub.subscribers
  );

  return scored.slice(0, POOL_LIMIT).map((x) => toCandidate(x.item.sub));
}
