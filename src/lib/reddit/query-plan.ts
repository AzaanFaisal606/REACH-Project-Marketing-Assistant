import type { ProjectSummary } from "@/lib/analysis/types";

// Build an ordered list of Reddit search queries from a project's keyword facets.
// The goal: guarantee the GEOGRAPHY axis gets searched. A place like "Pakistan"
// is usually one keyword among many, so a flat top-N search drops it — yet the
// audience's local subreddit (r/pakistan) and niche geo+topic subs are exactly
// what a launch tool should surface. We front-load geography so it survives the
// sequential early-stop and rate limiting.

const MAX_QUERIES = 6;

function clean(list: string[] | undefined): string[] {
  return (list ?? []).map((s) => s.trim()).filter(Boolean);
}

export function buildQueryPlan(summary: ProjectSummary): string[] {
  const f = summary.facets;
  const ordered: string[] = [];

  if (f) {
    const geo = clean(f.geography);
    const topic = clean(f.topic);
    const audience = clean(f.audience);
    const platform = clean(f.platform);

    // 1. Geography first: the place itself, then place × top topic (finds both
    //    r/<place> and niche r/<place>+hobby communities).
    for (const g of geo) {
      ordered.push(g);
      if (topic[0]) ordered.push(`${g} ${topic[0]}`);
    }
    // 2. Then the substance axes.
    ordered.push(...topic, ...audience, ...platform);
  }

  // Always fold in flat keywords so we never search less than the old behavior.
  ordered.push(...clean(summary.keywords));

  // Dedupe case-insensitively, preserve order, cap.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of ordered) {
    const k = q.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(q); }
    if (out.length >= MAX_QUERIES) break;
  }
  return out;
}
