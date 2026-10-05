import type { ProjectSummary } from "@/lib/analysis/types";
import type { SubredditRule } from "@/lib/reddit/rules";

const REDDIT_SYSTEM_SUB = `You write authentic Reddit launch posts for r/{subreddit}.
Rules you MUST follow:
- Problem-first framing: open with the problem the project solves, not a sales pitch.
- Do NOT put any link in the title.
- Sound like a real developer sharing work, not marketing copy. No buzzwords, no emoji spam.
- Obey every subreddit rule provided. If a rule forbids self-promotion, frame as a discussion / ask for feedback.
- Keep the title under 300 characters.
Return ONLY raw JSON: { "title": string, "body": string }. No prose, no code fences.`;

// No specific subreddit chosen — write a general-purpose Reddit post the user can
// take to a community of their choosing. Same voice rules, but no per-sub rules
// to obey since the target sub is unknown.
const REDDIT_SYSTEM_GENERIC = `You write authentic Reddit launch posts.
Rules you MUST follow:
- Problem-first framing: open with the problem the project solves, not a sales pitch.
- Do NOT put any link in the title.
- Sound like a real developer sharing work, not marketing copy. No buzzwords, no emoji spam.
- No specific subreddit is chosen, so keep it broadly postable and avoid overt self-promotion (frame as sharing work / asking for feedback).
- Keep the title under 300 characters.
Return ONLY raw JSON: { "title": string, "body": string }. No prose, no code fences.`;

function rulesBlock(rules: SubredditRule[]): string {
  if (rules.length === 0) return "(No machine-readable rules were available — follow general Reddit etiquette and avoid overt self-promotion.)";
  return rules.map((r, i) => `${i + 1}. ${r.name}${r.description ? ` — ${r.description}` : ""}`).join("\n");
}

// subreddit === null → generic post with no target community and no rules block.
export function buildRedditPrompt(
  summary: ProjectSummary,
  subreddit: string | null,
  rules: SubredditRule[],
  userPrompt = ""
): { system: string; user: string } {
  const system = subreddit
    ? REDDIT_SYSTEM_SUB.replace("{subreddit}", subreddit)
    : REDDIT_SYSTEM_GENERIC;
  // Optional free-text steering from the user. Appended as part of the user
  // message so it influences this post without overriding the hard system rules
  // (no link in title, problem-first, obey subreddit rules).
  const extra = userPrompt.trim()
    ? `\n\nAdditional instructions from the user (honor these unless they conflict with the rules above):\n${userPrompt.trim()}`
    : "";
  // The target-subreddit line and rules block are only included when a sub is
  // chosen; a generic post attaches neither.
  const targetLine = subreddit ? `Target subreddit: r/${subreddit}\n\n` : "";
  const rulesSection = subreddit
    ? `\n\nSubreddit rules to comply with:\n${rulesBlock(rules)}`
    : "";
  const user = `${targetLine}Project:
- Value proposition: ${summary.valueProp}
- Target user: ${summary.targetUser}
- Key features: ${summary.keyFeatures.join(", ")}
- Tone: ${summary.tone}${rulesSection}
${extra}

Write the post now as JSON.`;
  return { system, user };
}
