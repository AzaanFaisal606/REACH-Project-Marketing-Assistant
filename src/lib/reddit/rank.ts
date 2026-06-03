export interface SubredditCandidate {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  over18: boolean;
}

const MIN_SUBSCRIBERS = 1000;
const W_OVERLAP = 10;
const W_SIZE = 1;

function keywordOverlap(c: SubredditCandidate, keywords: string[]): number {
  const hay = `${c.name} ${c.title} ${c.description}`.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase().trim();
    if (k && hay.includes(k)) hits++;
  }
  return hits;
}

export function rankSubreddits(
  candidates: SubredditCandidate[],
  keywords: string[]
): SubredditCandidate[] {
  return candidates
    .filter((c) => !c.over18 && c.subscribers >= MIN_SUBSCRIBERS)
    .map((c) => {
      const overlap = keywordOverlap(c, keywords);
      const score = overlap * W_OVERLAP + Math.log10(c.subscribers + 1) * W_SIZE;
      return { c, overlap, score };
    })
    .filter((x) => x.overlap > 0) // must match at least one keyword
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.c);
}
