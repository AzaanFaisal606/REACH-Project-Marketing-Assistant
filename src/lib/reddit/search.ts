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

export async function searchSubreddits(keywords: string[]): Promise<SubredditCandidate[]> {
  const q = encodeURIComponent(keywords.slice(0, 6).join(" "));
  const url = `https://www.reddit.com/subreddits/search.json?q=${q}&limit=25`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 429) throw new Error("Reddit rate limit hit — wait a minute and retry.");
  if (!res.ok) throw new Error(`Reddit search failed: ${res.status}`);
  const json = (await res.json()) as { data?: { children?: RedditChild[] } };
  return (json.data?.children ?? []).map((c) => ({
    name: c.data.display_name,
    title: c.data.title ?? "",
    description: c.data.public_description ?? "",
    subscribers: c.data.subscribers ?? 0,
    over18: c.data.over18 ?? false
  }));
}
