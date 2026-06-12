import type { ProjectSummary } from "@/lib/analysis/types";

export type ToneProfile = 'buildinpublic' | 'datadriven' | 'technical' | 'hottake';
export type XFormat = 'tweet' | 'thread';

/** Hard rules shared by every X generation call. */
const X_SYSTEM_BASE = `You write authentic posts for X (Twitter) that launch a developer's project.
HARD RULES:
- Sound like a real developer sharing work — no buzzwords, no emoji spam, no marketing voice.
- Every tweet must be at most 280 characters. Count carefully.
- Front-load the most interesting element into the first ~8 words of the opening tweet — the hook lives at the very start.
- Output ONLY raw JSON in the exact shape requested. No prose, no markdown, no code fences.`;

const TONE_BLOCKS: Record<ToneProfile, string> = {
  buildinpublic: `TONE — build in public: Vulnerable and progress-focused. Share real metrics, a failure or a
hard decision, and invite the audience into the journey. Transparency over polish.`,
  datadriven: `TONE — data-driven: Lead with a specific number or concrete result; credibility comes from
specificity (e.g. "1,200 users in 9 days"). Outcome- and growth-oriented.`,
  technical: `TONE — technical: Deliver a tactical breakdown — teach the hard thing step by step, developer to
developer. Use architecture/benchmarks in service of a takeaway the reader can apply, not a spec dump.`,
  hottake: `TONE — hot take: Use a contrarian framework ("Everyone says X — here's why Y is actually better").
Polarising opener, identity-signal framing that invites both agreement and debate.`
};

const THREAD_STRUCTURE_BLOCK = `THREAD STRUCTURE (enforce):
- Tweet 1: the hook (use the provided hook verbatim or lightly tightened) — a problem statement or bold claim.
- Tweets 2 to N-1: body — exactly one idea per tweet, each giving a reason to keep reading.
- Final tweet: a clear call to action plus the project link placeholder.`;

const HASHTAG_RULE = `HASHTAGS: From the provided candidate list ONLY, select and rank 1-2 hashtags
(never invent tags; 1-2 maximum — more tags reduce reach). Place them on the final tweet of a
thread, or appended to a single tweet, within the 280-char budget.`;

function projectBlock(summary: ProjectSummary): string {
  return `Project:
- Value proposition: ${summary.valueProp}
- Target user: ${summary.targetUser}
- Key features: ${summary.keyFeatures.join(", ")}
- Tone: ${summary.tone}`;
}

function steering(userPrompt: string): string {
  return userPrompt.trim()
    ? `\n\nAdditional instructions from the user (honor these unless they conflict with the rules above):\n${userPrompt.trim()}`
    : "";
}

/** Phase 1, THREAD ONLY: three distinct opening-hook variants. */
export function buildXHooksPrompt(
  summary: ProjectSummary,
  tone: ToneProfile,
  userPrompt = ""
): { system: string; user: string } {
  const system = `${X_SYSTEM_BASE}

${TONE_BLOCKS[tone]}

TASK: Produce exactly three distinct opening-hook tweets for a thread, each a different angle:
1. Curiosity gap, 2. Stat or bold claim lead, 3. Story lead.
Each hook is at most 280 characters and works as the first tweet of a thread.
Return ONLY: { "hooks": [string, string, string] }`;
  const user = `${projectBlock(summary)}${steering(userPrompt)}

Write the three hooks now as JSON.`;
  return { system, user };
}

/** Phase 2: full generation. For a tweet, omit selectedHook. */
export function buildXPrompt(
  summary: ProjectSummary,
  format: XFormat,
  tone: ToneProfile,
  hashtags: string[],
  selectedHook = "",
  userPrompt = ""
): { system: string; user: string } {
  const threadBlock = format === "thread" ? `\n\n${THREAD_STRUCTURE_BLOCK}` : "";
  const system = `${X_SYSTEM_BASE}

${TONE_BLOCKS[tone]}${threadBlock}

${HASHTAG_RULE}

TASK: Generate the ${format === "thread" ? "thread as an ordered array of tweets" : "single tweet as a one-element array"}.
Return ONLY: { "tweets": string[] }`;
  const hookLine = format === "thread" && selectedHook.trim()
    ? `\n\nUse this exact hook as the first tweet (tighten only if needed to fit 280 chars):\n${selectedHook.trim()}`
    : "";
  const tagLine = hashtags.length
    ? `\n\nCandidate hashtags (choose 1-2, ranked):\n${hashtags.join(" ")}`
    : "";
  const user = `${projectBlock(summary)}${hookLine}${tagLine}${steering(userPrompt)}

Write the ${format} now as JSON.`;
  return { system, user };
}

/** Per-tweet regen, THREAD ONLY: context-aware single-tweet replacement. */
export function buildXTweetRegenPrompt(
  summary: ProjectSummary,
  tone: ToneProfile,
  tweets: string[],
  index: number,
  userPrompt = ""
): { system: string; user: string } {
  const system = `${X_SYSTEM_BASE}

${TONE_BLOCKS[tone]}

TASK: Rewrite ONE tweet inside an existing thread. Keep continuity with the surrounding tweets and
preserve that tweet's structural role given its position (first = hook, last = CTA + link, middle =
one body idea). At most 280 characters.
Return ONLY: { "tweet": string }`;
  const numbered = tweets.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const user = `${projectBlock(summary)}

Current thread (${tweets.length} tweets):
${numbered}

Rewrite tweet ${index + 1} (index ${index}, position ${index + 1} of ${tweets.length}). Return only the replacement.${steering(userPrompt)}`;
  return { system, user };
}
