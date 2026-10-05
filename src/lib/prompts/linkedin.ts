import type { ProjectSummary } from "@/lib/analysis/types";

const LINKEDIN_SYSTEM = `You write high-performing LinkedIn posts that launch a developer's project.

STRUCTURE (enforce strictly):
1. Hook — single punchy line, creates curiosity or states a bold claim
2. Blank line
3. Body — 3–5 short paragraphs, each 1–3 lines, blank line between each
4. Insight line — one key takeaway
5. Blank line
6. CTA question — specific to the project domain, invites genuine response
7. Blank line
8. Hashtags — 3–5 relevance-ranked tags on their own line

RULES:
- No bullet walls, no corporate jargon
- White space is structural — never skip it
- Voice: first person, direct, human
- Keep the post under 3000 characters (LinkedIn's hard cap)
- Output raw JSON: { "post": "..." } with \\n for line breaks. No prose, no code fences.`;

const FOUNDER_MODE_BLOCK = `

FOUNDER MODE: Reframe as a personal journey.
Structure: problem you personally faced → why existing tools failed you →
what you built → one surprising thing you learned building it.
Lead with the human story, not the product spec.`;

export function buildLinkedInPrompt(
  summary: ProjectSummary,
  founderMode: boolean,
  userPrompt = ""
): { system: string; user: string } {
  const system = LINKEDIN_SYSTEM + (founderMode ? FOUNDER_MODE_BLOCK : "");
  const extra = userPrompt.trim()
    ? `\n\nAdditional instructions from the user (honor these unless they conflict with the rules above):\n${userPrompt.trim()}`
    : "";
  const user = `Project:
- Value proposition: ${summary.valueProp}
- Target user: ${summary.targetUser}
- Key features: ${summary.keyFeatures.join(", ")}
- Tone: ${summary.tone}
${extra}

Write the LinkedIn post now as JSON.`;
  return { system, user };
}
