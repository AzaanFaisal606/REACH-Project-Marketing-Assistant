import { vi } from "vitest";

/** In-memory stand-in for a chrome.storage area (local or session). */
export function memoryArea() {
  const data: Record<string, unknown> = {};
  return {
    get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]))),
    set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
    remove: vi.fn(async (k: string | string[]) => { for (const key of [k].flat()) delete data[key]; })
  };
}
