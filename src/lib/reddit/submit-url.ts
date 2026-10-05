export const TITLE_MAX = 300;

// sub === null → the generic Reddit submit page (no community prefilled); the
// user picks the subreddit on Reddit. Used when a post is generated without a
// selected subreddit.
export function buildSubmitUrl(sub: string | null, title: string, body: string): string {
  if (title.length > TITLE_MAX) {
    throw new Error(`Title is ${title.length} chars; Reddit's limit is ${TITLE_MAX}.`);
  }
  const t = encodeURIComponent(title);
  const x = encodeURIComponent(body);
  const base = sub ? `https://www.reddit.com/r/${sub}/submit` : "https://www.reddit.com/submit";
  return `${base}?title=${t}&text=${x}`;
}
