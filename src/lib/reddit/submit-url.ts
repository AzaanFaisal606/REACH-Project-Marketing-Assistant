export const TITLE_MAX = 300;

export function buildSubmitUrl(sub: string, title: string, body: string): string {
  if (title.length > TITLE_MAX) {
    throw new Error(`Title is ${title.length} chars; Reddit's limit is ${TITLE_MAX}.`);
  }
  const t = encodeURIComponent(title);
  const x = encodeURIComponent(body);
  return `https://www.reddit.com/r/${sub}/submit?title=${t}&text=${x}`;
}
