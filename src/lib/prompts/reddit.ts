import type { ProjectSummary } from "@/lib/analysis/types";
import type { SubredditRule } from "@/lib/reddit/rules";

export const REDDIT_SYSTEM = `You write authentic Reddit launch posts for r/{subreddit}.
Rules you MUST follow:
- Problem-first framing: open with the problem the project solves, not a sales pitch.
- Do NOT put any link in the title.
- Sound like a real developer sharing work, not marketing copy. No buzzwords, no emoji spam.
- Obey every subreddit rule provided. If a rule forbids self-promotion, frame as a discussion / ask for feedback.
- Keep the title under 300 characters.
Return ONLY raw JSON: { "title": string, "body": string }. No prose, no code fences.`;

function rulesBlock(rules: SubredditRule[]): string {
  if (rules.length === 0) return "(No machine-readable rules were available — follow general Reddit etiquette and avoid overt self-promotion.)";
  return rules.map((r, i) => `${i + 1}. ${r.name}${r.description ? ` — ${r.description}` : ""}`).join("\n");
}

export function buildRedditPrompt(
  summary: ProjectSummary,
  subreddit: string,
  rules: SubredditRule[],
  userPrompt = ""
): { system: string; user: string } {
  const system = REDDIT_SYSTEM.replace("{subreddit}", subreddit);
  // Optional free-text steering from the user. Appended as part of the user
  // message so it influences this post without overriding the hard system rules
  // (no link in title, problem-first, obey subreddit rules).
  const extra = userPrompt.trim()
    ? `\n\nAdditional instructions from the user (honor these unless they conflict with the rules above):\n${userPrompt.trim()}`
    : "";
  const user = `Target subreddit: r/${subreddit}

Project:
- Value proposition: ${summary.valueProp}
- Target user: ${summary.targetUser}
- Key features: ${summary.keyFeatures.join(", ")}
- Tone: ${summary.tone}

Subreddit rules to comply with:
${rulesBlock(rules)}
${extra}

Write the post now as JSON.`;
  return { system, user };
}
