/** Search keywords grouped by relevance axis. The analyzer fills these so the
 *  community search can guarantee coverage per axis — geography in particular
 *  must not get crowded out by topic words. All facets are optional; older
 *  stored summaries (and the analyzer when it returns nothing typed) fall back
 *  to the flat `keywords` list. */
export interface KeywordFacets {
  topic?: string[];       // what it is / does (e.g. "pc building", "marketplace")
  audience?: string[];    // who it's for (e.g. "gamers", "developers")
  geography?: string[];   // place/region (e.g. "Pakistan", "south asia")
  platform?: string[];    // tech/platform (e.g. "chrome extension", "ios")
}

export interface ProjectSummary {
  valueProp: string;
  targetUser: string;
  keyFeatures: string[];
  tone: string;
  keywords: string[];
  facets?: KeywordFacets;
  xFormat?: 'tweet' | 'thread';   // auto baseline for the X tab (decided at analysis time)
  xFormatReason?: string;          // one-line human rationale, surfaced in the X tab UI
}

const FACET_KEYS = ["topic", "audience", "geography", "platform"] as const;

/** All facet values flattened, de-duped, order preserved. Falls back to the
 *  flat keyword list when no facets are present. */
export function flattenFacets(summary: ProjectSummary): string[] {
  const facets = summary.facets;
  if (!facets) return summary.keywords;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const key of FACET_KEYS) {
    for (const kw of facets[key] ?? []) {
      const k = kw.trim();
      const lower = k.toLowerCase();
      if (k && !seen.has(lower)) { seen.add(lower); out.push(k); }
    }
  }
  // Include any flat keywords the facets missed, so we never search less than before.
  for (const kw of summary.keywords) {
    const lower = kw.trim().toLowerCase();
    if (kw.trim() && !seen.has(lower)) { seen.add(lower); out.push(kw.trim()); }
  }
  return out.length > 0 ? out : summary.keywords;
}

export function isProjectSummary(v: unknown): v is ProjectSummary {
  const o = v as Record<string, unknown>;
  const allStrings = (a: unknown): a is string[] =>
    Array.isArray(a) && a.every((x) => typeof x === "string");
  const facetsOk = (f: unknown): boolean => {
    if (f === undefined) return true;
    if (!f || typeof f !== "object") return false;
    return FACET_KEYS.every((k) => {
      const v = (f as Record<string, unknown>)[k];
      return v === undefined || allStrings(v);
    });
  };
  const xFormatOk = o.xFormat == null || o.xFormat === "tweet" || o.xFormat === "thread";
  const xReasonOk = o.xFormatReason == null || typeof o.xFormatReason === "string";
  return (
    !!o &&
    typeof o.valueProp === "string" &&
    typeof o.targetUser === "string" &&
    allStrings(o.keyFeatures) &&
    typeof o.tone === "string" &&
    allStrings(o.keywords) &&
    facetsOk(o.facets) &&
    xFormatOk &&
    xReasonOk
  );
}
