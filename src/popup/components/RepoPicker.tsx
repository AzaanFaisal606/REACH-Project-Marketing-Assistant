import { useState, useEffect } from "preact/hooks";
import { storage } from "@/lib/storage/storage";
import { listUserRepos, timeAgo } from "@/lib/github/list-repos";
import { SearchableSelect } from "./SearchableSelect";
import type { SelectOption } from "./select-filter";

// The connected user's repos as a searchable dropdown. Picking one fills the
// repo URL, so Analyze works exactly as if it had been pasted.
export function RepoPicker({ selectedUrl, onPick }: { selectedUrl: string; onPick: (url: string) => void }) {
  const [options, setOptions] = useState<SelectOption[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const repos = await listUserRepos(await storage.getGithubToken());
        setOptions(repos.map((r) => ({
          id: r.url,
          label: r.fullName,
          badge: r.private ? "private" : undefined,
          meta: timeAgo(r.pushedAt),
          hint: r.description
        })));
      } catch (e) {
        setError((e as Error).message);
        setOptions([]);
      }
    })();
  }, []);

  return (
    <div class="repo-picker">
      <SearchableSelect
        label="Your GitHub repos"
        options={options}
        value={selectedUrl}
        placeholder={options ? `Select a repository (${options.length})` : "Loading your repos…"}
        onChange={onPick}
      />
      {error && <p class="error">{error}</p>}
    </div>
  );
}
