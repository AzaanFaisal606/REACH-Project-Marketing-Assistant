export const ANALYSIS_SYSTEM = `You analyze a project description and return ONLY a JSON object.
The project may be code or non-code. Do not include any prose, markdown fences, or
explanation — return raw JSON matching exactly this shape:
{
  "valueProp": string,        // one sentence: what it does and why it matters
  "targetUser": string,       // who it's for
  "keyFeatures": string[],    // 3-6 concrete features
  "tone": string,             // e.g. "technical", "playful", "professional"
  "keywords": string[]        // 5-10 search keywords for finding relevant communities
}`;

export function analysisUserPrompt(projectContext: string): string {
  return `Project context:\n\n${projectContext}\n\nReturn the JSON object now.`;
}
