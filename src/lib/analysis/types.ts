export interface ProjectSummary {
  valueProp: string;
  targetUser: string;
  keyFeatures: string[];
  tone: string;
  keywords: string[];
}

export function isProjectSummary(v: unknown): v is ProjectSummary {
  const o = v as Record<string, unknown>;
  const allStrings = (a: unknown): a is string[] =>
    Array.isArray(a) && a.every((x) => typeof x === "string");
  return (
    !!o &&
    typeof o.valueProp === "string" &&
    typeof o.targetUser === "string" &&
    allStrings(o.keyFeatures) &&
    typeof o.tone === "string" &&
    allStrings(o.keywords)
  );
}
