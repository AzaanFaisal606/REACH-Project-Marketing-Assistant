// Host access for AI providers is requested at runtime, per provider, instead
// of up front at install (see optional_host_permissions in manifest.ts).

/** Only http(s) addresses with a host. "localhost:1234/v1" (no scheme) parses
 *  as protocol "localhost:", so it's rejected here rather than later by Chrome. */
function parse(baseUrl: string): URL | null {
  try {
    const u = new URL(baseUrl);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname ? u : null;
  } catch {
    return null;
  }
}

export function isValidAddress(baseUrl: string): boolean {
  return parse(baseUrl) !== null;
}

/** "https://api.deepseek.com/*". Chrome match patterns ignore ports, so localhost:1234 → http://localhost/*. */
export function originPattern(baseUrl: string): string {
  const u = parse(baseUrl);
  return u ? `${u.protocol}//${u.hostname}/*` : "";
}

export function hostOf(baseUrl: string): string {
  return parse(baseUrl)?.hostname ?? baseUrl;
}

export async function hasAccess(baseUrl: string): Promise<boolean> {
  const pattern = originPattern(baseUrl);
  if (!pattern) return false;
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}

/** Shows Chrome's permission prompt. Must be called from a click handler. */
export async function requestAccess(baseUrl: string): Promise<boolean> {
  const pattern = originPattern(baseUrl);
  return pattern ? chrome.permissions.request({ origins: [pattern] }) : false;
}
