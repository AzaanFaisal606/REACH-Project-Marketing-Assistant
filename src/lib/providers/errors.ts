// Turn a provider's HTTP error (status + raw body) into a short, human message.
// Providers bury the useful part (quota reason, retry delay, "limit: 0") inside
// JSON; surface it instead of dumping the whole body or a bare status code.

const MAX_LEN = 240;

interface ProviderErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ "@type"?: string; retryDelay?: string }>;
  };
}

function truncate(s: string): string {
  return s.length > MAX_LEN ? `${s.slice(0, MAX_LEN - 1)}…` : s;
}

export function describeProviderError(label: string, status: number, body: string): string {
  let parsed: ProviderErrorBody | null = null;
  try {
    parsed = JSON.parse(body) as ProviderErrorBody;
  } catch {
    parsed = null;
  }

  const detail = parsed?.error?.message?.trim();

  // 429 is the most common confusing case — distinguish "no allowance at all"
  // (limit: 0 → needs billing/region) from ordinary rate limiting (retry).
  if (status === 429) {
    const zeroQuota = detail ? /limit:\s*0\b/.test(detail) : false;
    const retry = parsed?.error?.details?.find((d) => d["@type"]?.includes("RetryInfo"))?.retryDelay;
    if (zeroQuota) {
      return `${label}: this API key has no quota for the requested model (free-tier limit is 0). ` +
        `Enable billing on the project or use a key/region with quota. (HTTP 429)`;
    }
    const tail = retry ? ` Retry in ${retry}.` : " Wait a minute and retry.";
    return truncate(`${label} is rate-limited (HTTP 429).${tail}` + (detail ? ` ${detail}` : ""));
  }

  if (detail) return truncate(`${label} error ${status}: ${detail}`);
  return `${label} error ${status}.`;
}
