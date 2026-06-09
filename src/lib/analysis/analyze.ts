import type { Provider, GenerateInput, ProviderConfig } from "@/lib/providers/types";
import { generate as defaultGenerate } from "@/lib/providers/types";
import { isProjectSummary, type ProjectSummary } from "./types";
import { ANALYSIS_SYSTEM, analysisUserPrompt } from "@/lib/prompts/analysis";

type GenFn = (provider: Provider, input: GenerateInput, config: ProviderConfig) => Promise<string>;

class AnalysisParseError extends Error {}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new AnalysisParseError("No JSON object found");
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AnalysisParseError("Invalid JSON");
  }
}

export async function analyze(
  projectContext: string,
  provider: Provider,
  config: ProviderConfig,
  gen: GenFn = defaultGenerate
): Promise<ProjectSummary> {
  const attempt = async (extraInstruction = ""): Promise<ProjectSummary> => {
    const out = await gen(
      provider,
      { system: ANALYSIS_SYSTEM + extraInstruction, user: analysisUserPrompt(projectContext) },
      config
    );
    const parsed = extractJson(out);
    if (!isProjectSummary(parsed)) throw new AnalysisParseError("JSON missing required fields");
    return parsed;
  };

  try {
    return await attempt();
  } catch (e) {
    if (!(e instanceof AnalysisParseError)) throw e; // don't swallow real bugs
    return await attempt("\n\nIMPORTANT: Return ONLY raw JSON. No prose. No code fences.");
  }
}
