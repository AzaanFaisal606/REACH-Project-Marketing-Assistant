// The signed-in user's repos for the picker in InputPanel (needs the OAuth token).

const API = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 10; // 1,000 repos is plenty for a picker

export interface RepoSummary {
  fullName: string;    // owner/name
  url: string;         // https://github.com/owner/name
  private: boolean;
  description: string;
  pushedAt: string;    // ISO date of the last push
}

interface GhRepo {
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  pushed_at: string | null;
}

/** Every repo the user owns, collaborates on, or can see through an org, most recently pushed first. */
export async function listUserRepos(token: string): Promise<RepoSummary[]> {
  const out: RepoSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${API}/user/repos?per_page=${PER_PAGE}&sort=pushed&page=${page}`, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) throw new Error("GitHub sign-in expired. Reconnect GitHub.");
    if (!res.ok) throw new Error(`Couldn't load your GitHub repos (${res.status}).`);
    const batch = (await res.json()) as GhRepo[];
    for (const r of batch) {
      out.push({
        fullName: r.full_name,
        url: r.html_url,
        private: r.private,
        description: r.description ?? "",
        pushedAt: r.pushed_at ?? ""
      });
    }
    if (batch.length < PER_PAGE) break;
  }
  return out;
}

/** "just now", "5m ago", "3h ago", "2d ago", "4mo ago", "1y ago". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, (now - t) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [secs, label] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
  return "just now";
}
