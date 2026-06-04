import type { SubredditCandidate } from "./rank";

interface RedditChild {
  data: {
    display_name: string;
    title: string;
    public_description: string;
    subscribers: number | null;
    over18: boolean;
  };
}

// Search the strongest keywords individually and merge — one joined query is too
// narrow (Reddit treats it as a single relevance match). But fire them
// SEQUENTIALLY with a small gap, not in parallel: a burst of requests to
// reddit.com gets rate-limited (429), which silently shrinks the result set.
const MAX_KEYWORD_QUERIES = 4;
const PER_QUERY_LIMIT = 25;
// Once we have this many unique candidates, stop querying further keywords —
// rank only surfaces the top 5, so a deeper pool just risks the rate limit.
const ENOUGH_CANDIDATES = 15;
const GAP_MS = 350;

class RedditBlockedError extends Error {}
export class RedditRateLimitError extends Error {}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function searchOne(keyword: string): Promise<SubredditCandidate[]> {
  const q = encodeURIComponent(keyword.trim());
  const url = `https://www.reddit.com/subreddits/search.json?q=${q}&limit=${PER_QUERY_LIMIT}&raw_json=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 429) throw new RedditRateLimitError("Reddit rate limit hit (429).");
  if (res.status === 403) throw new RedditBlockedError("Reddit blocked the request (403).");
  if (!res.ok) throw new RedditBlockedError(`Reddit search failed: ${res.status}`);

  // Reddit sometimes answers with an HTML interstitial (200, text/html) instead
  // of JSON. Parsing that as JSON throws a cryptic "Unexpected token <"; detect
  // it and surface a Reddit-specific message instead.
  const text = await res.text();
  let json: { data?: { children?: RedditChild[] } };
  try {
    json = JSON.parse(text);
  } catch {
    throw new RedditBlockedError("Reddit returned a non-JSON response (it may be rate-limiting or blocking requests).");
  }

  return (json.data?.children ?? []).map((c) => ({
    name: c.data.display_name,
    title: c.data.title ?? "",
    description: c.data.public_description ?? "",
    subscribers: c.data.subscribers ?? 0,
    over18: c.data.over18 ?? false
  }));
}

export async function searchSubreddits(keywords: string[]): Promise<SubredditCandidate[]> {
  const queries = keywords.map((k) => k.trim()).filter(Boolean).slice(0, MAX_KEYWORD_QUERIES);
  if (queries.length === 0) return [];

  const byName = new Map<string, SubredditCandidate>();
  let rateLimited: Error | null = null;
  let blocked = 0;
  let succeeded = 0;

  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await sleep(GAP_MS); // be polite — avoid tripping Reddit's rate limit
    try {
      const found = await searchOne(queries[i]);
      succeeded++;
      for (const c of found) if (!byName.has(c.name)) byName.set(c.name, c);
      if (byName.size >= ENOUGH_CANDIDATES) break; // enough to rank a good top 5
    } catch (e) {
      // A single keyword failing must never discard candidates already gathered
      // from earlier keywords. Note the failure and move on; only an all-empty
      // result surfaces an error below. Rate-limit is the exception — once Reddit
      // starts 429ing, further requests will too, so stop early.
      if (e instanceof RedditRateLimitError) { rateLimited = e; break; }
      blocked++;
    }
  }

  // Surface a failure only when nothing came back. A single keyword failing
  // shouldn't sink the whole search — the others can still produce candidates.
  if (byName.size === 0) {
    if (rateLimited) throw rateLimited;
    // 403/HTML interstitials are Reddit throttling unauthenticated requests —
    // same remedy as a 429, so report it as a rate-limit to the user.
    if (blocked > 0) {
      throw new RedditRateLimitError("Reddit blocked the request — it may be rate-limiting.");
    }
  }

  return [...byName.values()];
}
