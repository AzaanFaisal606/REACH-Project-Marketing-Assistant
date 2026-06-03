export interface SubredditRule {
  name: string;
  description: string;
}

export async function fetchSubredditRules(sub: string): Promise<SubredditRule[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/about/rules.json`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return []; // non-fatal: generate with conventions only
    const json = (await res.json()) as { rules?: Array<{ short_name?: string; description?: string }> };
    return (json.rules ?? []).map((r) => ({
      name: r.short_name ?? "",
      description: r.description ?? ""
    }));
  } catch {
    return [];
  }
}
