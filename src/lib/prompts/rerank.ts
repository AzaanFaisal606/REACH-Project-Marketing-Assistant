import type { ProjectSummary } from "@/lib/analysis/types";
import type { SubredditCandidate } from "@/lib/reddit/rank";

export const RERANK_SYSTEM = `You rank subreddits by how well a project fits each community for a launch/feedback post.
Score each provided subreddit 0-100 on fit, judging:
- topical relevance to what the project actually is,
- whether the project's AUDIENCE (including their country/region) is present there,
- whether posting about a project like this is welcome (vs. a huge generic sub where it drowns or gets removed).
A smaller, on-target community should outscore a giant loosely-related one.
ONLY score subreddits from the provided list. Do NOT invent subreddit names.
Return ONLY a raw JSON array, highest score first, no prose, no code fences:
[{ "name": string, "score": number }]`;

function candidateBlock(candidates: SubredditCandidate[]): string {
  return candidates
    .map((c) => `- ${c.name} (${c.subscribers.toLocaleString()} members): ${c.title}. ${c.description}`.trim())
    .join("\n");
}

export function buildRerankPrompt(
  summary: ProjectSummary,
  candidates: SubredditCandidate[]
): { system: string; user: string } {
  const geo = summary.facets?.geography?.length ? summary.facets.geography.join(", ") : "none specified";
  const user = `Project:
- Value proposition: ${summary.valueProp}
- Target user: ${summary.targetUser}
- Key features: ${summary.keyFeatures.join(", ")}
- Geography / region: ${geo}

Candidate subreddits:
${candidateBlock(candidates)}

Score every candidate now as a JSON array.`;
  return { system: RERANK_SYSTEM, user };
}
