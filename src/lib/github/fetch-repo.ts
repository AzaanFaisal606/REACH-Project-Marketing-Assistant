import type { RepoRef } from "./parse-url";

const API = "https://api.github.com";

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function decodeBase64(content: string): string {
  try { return decodeURIComponent(escape(atob(content.replace(/\n/g, "")))); }
  catch { return atob(content.replace(/\n/g, "")); }
}

export async function fetchRepoContext(ref: RepoRef, token?: string): Promise<string> {
  const metaRes = await fetch(`${API}/repos/${ref.owner}/${ref.repo}`, { headers: headers(token) });
  if (metaRes.status === 404) throw new Error("Repo not found (or private without access).");
  if (metaRes.status === 403) throw new Error("GitHub rate limit or access denied.");
  if (!metaRes.ok) throw new Error(`GitHub error ${metaRes.status}`);
  const meta = (await metaRes.json()) as {
    name: string; description: string | null; language: string | null; topics?: string[];
  };

  let readme = "";
  const readmeRes = await fetch(`${API}/repos/${ref.owner}/${ref.repo}/readme`, { headers: headers(token) });
  if (readmeRes.ok) {
    const j = (await readmeRes.json()) as { content?: string; encoding?: string };
    if (j.content) readme = decodeBase64(j.content);
  }

  return [
    `Project name: ${meta.name}`,
    meta.description ? `Description: ${meta.description}` : "",
    meta.language ? `Primary language: ${meta.language}` : "",
    meta.topics?.length ? `Topics: ${meta.topics.join(", ")}` : "",
    "",
    "README:",
    readme || "(no README found)"
  ].filter(Boolean).join("\n");
}
