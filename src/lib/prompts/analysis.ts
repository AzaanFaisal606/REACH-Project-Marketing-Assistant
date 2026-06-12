export const ANALYSIS_SYSTEM = `You analyze a project description and return ONLY a JSON object.
The project may be code or non-code. Do not include any prose, markdown fences, or
explanation — return raw JSON matching exactly this shape:
{
  "valueProp": string,        // one sentence: what it does and why it matters
  "targetUser": string,       // who it's for
  "keyFeatures": string[],    // 3-6 concrete features
  "tone": string,             // e.g. "technical", "playful", "professional"
  "keywords": string[],       // 5-10 search keywords for finding relevant communities
  "facets": {                 // the SAME keywords, grouped by axis (for community search)
    "topic": string[],        // what it is / does — e.g. "pc building", "marketplace"
    "audience": string[],     // who it's for — e.g. "gamers", "developers"
    "geography": string[],    // ANY country/region/city the project targets or is for.
                              //   Infer from the description even if implicit (a local
                              //   marketplace, regional pricing, a place name). [] if truly global.
    "platform": string[]      // tech/platform — e.g. "chrome extension", "ios", "web app"
  },
  "xFormat": "tweet" | "thread",   // would this launch better as one tweet or a multi-tweet thread?
  "xFormatReason": string          // one short sentence explaining the choice
}

Rules:
- "keywords" must equal the union of all four facet arrays (so older tooling still works).
- Geography matters: if the project serves a specific place (e.g. "Pakistani retailers",
  "for the UK", "Tokyo events"), put that place in "facets.geography". Do not omit it.
- Keep each keyword short (1-3 words), lowercase except proper nouns.
- xFormat: choose "thread" when the project has enough depth (multiple distinct features, a
  non-obvious problem, or a technical story) to sustain several connected tweets; otherwise "tweet".
- Keep xFormatReason to one sentence.`;

export function analysisUserPrompt(projectContext: string): string {
  return `Project context:\n\n${projectContext}\n\nReturn the JSON object now.`;
}
