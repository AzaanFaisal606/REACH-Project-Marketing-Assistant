export interface RepoRef { owner: string; repo: string; }

export function parseRepoUrl(input: string): RepoRef | null {
  const s = input.trim();
  const url = s.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
  if (url) return { owner: url[1], repo: url[2].replace(/\.git$/i, "") };
  const short = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], repo: short[2].replace(/\.git$/i, "") };
  return null;
}
