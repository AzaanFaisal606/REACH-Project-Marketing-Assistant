import type { ProjectSummary } from "@/lib/analysis/types";
import type { Provider, ProviderConfig } from "@/lib/providers/types";
import { generate as defaultGenerate } from "@/lib/providers/types";
import { buildLinkedInPrompt } from "@/lib/prompts/linkedin";

/** LinkedIn's hard post cap. Exported from this .ts (not the editor .tsx) so
 *  tests and the editor can both import it without tripping the zimmerframe
 *  hook-names crash. */
export const LINKEDIN_MAX = 3000;

type GenFn = typeof defaultGenerate;

/** Build the LinkedIn prompt, call the provider, and parse the { post } JSON.
 *  `gen` is injectable for tests; defaults to the real provider generate(). */
export async function generateLinkedInPost(
  summary: ProjectSummary,
  founderMode: boolean,
  userPrompt: string,
  provider: Provider,
  config: ProviderConfig,
  gen: GenFn = defaultGenerate
): Promise<string> {
  const { system, user } = buildLinkedInPrompt(summary, founderMode, userPrompt);
  const raw = await gen(provider, { system, user }, config);
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const obj = JSON.parse(
    cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1)
  ) as { post?: string };
  return obj.post ?? "";
}
