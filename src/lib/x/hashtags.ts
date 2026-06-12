import type { ProjectSummary } from "@/lib/analysis/types";
import { flattenFacets } from "@/lib/analysis/types";

export interface HashtagTaxonomy {
  stack: string[];
  domain: string[];
  audience: string[];
  format: string[];
}

export const HASHTAG_TAXONOMY: HashtagTaxonomy = {
  stack: [
    "#javascript", "#typescript", "#python", "#rustlang", "#golang", "#java", "#kotlin", "#swift",
    "#cpp", "#csharp", "#php", "#ruby", "#elixir", "#scala", "#dart", "#react", "#reactjs",
    "#nextjs", "#vue", "#vuejs", "#angular", "#svelte", "#solidjs", "#nodejs", "#deno", "#bun",
    "#express", "#nestjs", "#django", "#flask", "#fastapi", "#rails", "#laravel", "#spring",
    "#dotnet", "#flutter", "#reactnative", "#tailwindcss", "#postgres", "#mysql", "#mongodb",
    "#redis", "#sqlite", "#graphql", "#prisma", "#docker", "#kubernetes", "#terraform", "#aws",
    "#azure", "#gcp", "#cloudflare", "#vercel", "#supabase", "#firebase", "#wasm", "#webgl",
    "#threejs", "#electron", "#tauri", "#vite", "#webpack", "#linux", "#neovim"
  ],
  domain: [
    "#ai", "#machinelearning", "#ml", "#llm", "#genai", "#nlp", "#computervision", "#deeplearning",
    "#datascience", "#dataengineering", "#analytics", "#devtools", "#devops", "#platformengineering",
    "#cybersecurity", "#infosec", "#appsec", "#privacy", "#blockchain", "#web3", "#crypto", "#defi",
    "#fintech", "#edtech", "#healthtech", "#martech", "#ecommerce", "#saas", "#paas", "#api",
    "#opensource", "#oss", "#cli", "#automation", "#nocode", "#lowcode", "#productivity", "#uiux",
    "#design", "#frontend", "#backend", "#fullstack", "#mobile", "#gamedev", "#ar", "#vr", "#iot",
    "#robotics", "#embedded", "#databases", "#observability", "#testing", "#performance"
  ],
  audience: [
    "#developers", "#devcommunity", "#programming", "#coding", "#softwareengineering", "#webdev",
    "#webdevelopment", "#indiedev", "#indiehackers", "#solofounder", "#solopreneur", "#startup",
    "#startups", "#founders", "#entrepreneur", "#bootstrapped", "#saasfounder", "#techstartup",
    "#productmanagement", "#designers", "#datascientists", "#sysadmin", "#students", "#codenewbie",
    "#learntocode", "#womenintech", "#freelancedev", "#remotework", "#techtwitter"
  ],
  format: [
    "#buildinpublic", "#buildinginpublic", "#100daysofcode", "#devlog", "#shipit", "#launchday",
    "#showyourwork", "#sideproject", "#weekendproject", "#madewithcode", "#producthunt",
    "#indiehacking", "#codenewbies", "#dailycoding", "#nowbuilding", "#shippinglane"
  ]
};

/** Tokens we match project signal against (lowercase, '#'-stripped). */
function tagToken(tag: string): string {
  return tag.replace(/^#/, "").toLowerCase();
}

/**
 * Filter the taxonomy down to a relevant subset for the prompt. Matches stack/domain/audience
 * tags whose token appears in (or is a substring of) any project signal word (facets + keywords);
 * always offers the format tags as candidates. Falls back to a broad default subset when nothing
 * matches, so the list is never empty. De-dupes, order: stack, domain, audience, format.
 */
export function filterHashtags(summary: ProjectSummary): string[] {
  const signal = new Set<string>();
  for (const w of flattenFacets(summary)) {
    for (const part of w.toLowerCase().split(/[^a-z0-9]+/)) if (part) signal.add(part);
  }

  const matches = (tag: string): boolean => {
    const tok = tagToken(tag);
    for (const s of signal) {
      if (tok === s || tok.includes(s) || s.includes(tok)) return true;
    }
    return false;
  };

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string) => {
    const k = tag.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(tag); }
  };

  for (const cat of ["stack", "domain", "audience"] as const) {
    for (const tag of HASHTAG_TAXONOMY[cat]) if (matches(tag)) push(tag);
  }
  const topicalCount = out.length; // count of stack/domain/audience matches, before format tags

  // Format/post-culture tags are always good candidates regardless of stack.
  for (const tag of HASHTAG_TAXONOMY.format) push(tag);

  // Broad fallback: if nothing topical matched, offer a generic dev set so the prompt isn't bare.
  if (topicalCount === 0) {
    for (const tag of ["#developers", "#devcommunity", "#coding", "#devtools", "#opensource"]) push(tag);
  }
  return out;
}
