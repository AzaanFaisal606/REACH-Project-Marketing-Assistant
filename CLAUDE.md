# REACH — Project Working Notes

> **Local-only file. Gitignored. NEVER commit into the repo** (global rule: no Claude/AI/tooling artifacts in project repos). Purpose: let a fresh session pick up the build. Verify it stays in `.gitignore` before any commit.

## What this is

MV3 Chrome extension: turns a GitHub repo (public or private) or an uploaded README into a **Reddit launch post** via a BYOK AI model. Reddit is the only fully-built tab; X + LinkedIn are "Coming soon" stubs (`ComingSoonTab`).

End-to-end flow (working): add project (README upload **or** GitHub repo URL) → AI analyze → ProjectSummary → Find communities (heuristic rank → AI re-rank by fit) → pick subreddit → fetch its rules → Generate post (optional free-text user steering) → Open Reddit submit page prefilled.

- No spec/plan files survive on disk or in git history. **This file + the committed code + git log are the only source of truth.**

## Stack

Preact + Vite **8** + TypeScript, Vitest, npm. Build plugin: `@crxjs/vite-plugin` (works on Vite 8). Manifest authored in `src/manifest.ts` via `defineManifest` (NOT a hand-written manifest.json — crxjs generates it). Entry: `src/popup/` (popup UI) + `src/background/service-worker.ts`.

- **One backend:** Cloudflare Worker (`worker/`) for GitHub OAuth token exchange (private repos). Keeps the client secret server-side.
- **Key storage:** API keys XOR+base64 obfuscated (`src/lib/storage/obfuscate.ts`) — NOT real encryption (MV3 has no keystore; disclosed in UI).
- **Static assets:** `public/` is copied to dist root by crxjs. Extension icons live in `public/icons/` (`icon-16/32/48/128.png`); referenced by `src/manifest.ts` (`icons` + `action.default_icon`) and imported into the popup header via `import logoUrl from "/icons/icon-128.png"`.

## BYOK providers

**Claude, GPT, Gemini, Ollama** — all built. Generic `Provider` interface (`src/lib/providers/types.ts`: `buildRequest` / `parseResponse` / `testRequest`); registry in `src/lib/providers/index.ts` (`PROVIDERS`, `getProvider`, `PROVIDER_LIST`). Grok deferred but the registry is generic so it slots in.

- Cloud providers use `apiKey`. **Ollama uses `baseUrl` + `model`, no key** — config shape is optional-fields `{ apiKey?, baseUrl?, model? }`, branched in `state.ts` `providerConfig()` / `providerReady()` and in `Settings.tsx` (`isOllama`).
- Gemini model is `gemini-2.0-flash` (1.5 retired → 404).
- **CORS verified live:** Claude ✓, Gemini ✓. GPT mocked-tested only (identical adapter pattern). Ollama needs `OLLAMA_ORIGINS="chrome-extension://*" ollama serve` (Settings shows the command) + `host_permissions: http://localhost/*` (present in manifest).
- Provider errors are surfaced readably via `src/lib/providers/errors.ts` (`describeProviderError`).

## Repo / git state

- **Remote EXISTS + pushed:** `origin` → `https://github.com/AzaanFaisal606/REACH-Project-Marketing-Assistant.git`. Working on **`main`**, which tracks `origin/main`. (Earlier notes said "no remote / never pushed" — that is obsolete.)
- **Tests:** main suite **141 pass / 25 files**; worker suite **4 pass / 1 file**. `npm test` green. `npm run build` compiles popup + service worker + copies icons to `dist/`.
- Git identity: AzaanFaisal606 / azaanfaisal606@gmail.com.

## Execution rules (USER-ENFORCED — do not relax)

- **Confirm every commit message with the user before committing.** Never pick the message yourself — propose/ask, use exactly what they give. Subagents must STOP before `git commit` and report staged files.
- **Never commit or push without explicit user go-ahead.**
- **No Claude/AI/tooling mention** in any commit message, PR text, or committed file. **No co-author trailers, ever.** `CLAUDE.md`, `.claude/`, `.superpowers/`, `.worktrees/` are gitignored — keep them out.
- **Stage explicitly** (list paths) — never `git add -A`/`.` blind. Pre-commit, scan the diff for secrets (client id / secret / `localhost:8787`) and artifacts.
- **Plan/brainstorm only after asking the user first** (global rule). For multi-task plans the user historically wanted subagent-driven execution + per-task prompting, but **ask** — small changes are done inline, silently (user prefers terse no-narration work, summary at end).
- Caveman mode is usually active in the user's session (terse) — does NOT affect committed code/messages (those stay normal prose).

## Hard-won gotchas (KEEP THESE)

- **.ts-not-.tsx rule:** `@preact/preset-vite`'s `preact:transform-hook-names` plugin CRASHES (`No "exports" main defined in zimmerframe/package.json`) when a vitest test imports a hooks-using `.tsx`. → **Put any test-imported pure logic in a `.ts` file, not a component `.tsx`.** (Why `readFileText` lives in `src/popup/components/read-file.ts`, not in `InputPanel.tsx`.)
- **CSS is split** under `src/popup/styles/` — barrel `index.css` `@import`s partials (`_tokens` `_fonts` `_base` `_layout` `_controls` `_components`). `_tokens.css` is the single source of truth for design tokens (CSS custom props). Theme = graphite `#161617` + warm amber **`--accent: #d99a4e`** (`--accent-press: #c2853a`). Self-hosted IBM Plex Sans woff2 (400/600) under `src/popup/fonts/`.
- `npx tsc --noEmit` emits a harmless `baseUrl` deprecation warning (TS5101) from tsconfig — not an error.
- Reddit search hits `reddit.com/subreddits/search.json` unauthenticated → easily rate-limited (429) / HTML-interstitial (403); `search.ts` handles both. Queries fire sequentially with a gap, not in parallel.

## Key modules (map)

- **Providers:** `src/lib/providers/{claude,gpt,gemini,ollama}.ts` + `index.ts` (registry) + `types.ts` + `errors.ts`.
- **Analysis:** `src/lib/analysis/analyze.ts` (injectable `gen`, JSON-repair retry scoped to `AnalysisParseError`) + `types.ts` (`ProjectSummary`, `KeywordFacets`) + `src/lib/prompts/analysis.ts`.
- **Reddit:** `src/lib/reddit/` — `search.ts` (keyword search + merge), `rank.ts` (heuristic: overlap×10 + log10(subs); filters `over18`, **NSFW word-blocklist** `isNsfw`, <1000-subs, zero-overlap; top-N; geo diversity slot), `rerank.ts` (+ `prompts/rerank.ts`: AI fit-scoring → `.fit-badge` high/mid/low), `facets`/`query-plan.ts`/`restrictions.ts` (geo-aware faceted queries), `rules.ts` (lazy per-picked-sub, non-fatal), `submit-url.ts` (`TITLE_MAX=300`).
- **Reddit prompt:** `src/lib/prompts/reddit.ts` — `buildRedditPrompt(summary, sub, rules, userPrompt?)`; optional `userPrompt` appended as user-message steering under the hard system rules (no link in title, problem-first, dev voice, raw-JSON `{title,body}`).
- **GitHub:** `src/lib/github/parse-url.ts` + `fetch-repo.ts` (`fetchRepoContext(ref, token?)` → ProjectContext; 404/403 handling).
- **Store:** `src/popup/state.ts` (Preact signals: `appState`, `reddit`; actions `runAnalysis`, `findCommunities`, `selectSubreddit`, `generatePost`/`regeneratePost`, `openSubmit`, `connectGithub`, provider/ollama savers, `hydrate`). Reddit session + draft persist to `chrome.storage` so reopening resumes mid-flow.
- **UI:** `src/popup/App.tsx` (header w/ logo + beta tag + provider chip + gear, tab bar, body), `components/` (`InputPanel`, `Settings`, `SubredditCard`, `DraftEditor`, `WaveDivider`), `tabs/` (`RedditTab`, `ComingSoonTab`).
- **Worker:** `worker/src/index.ts` (POST code→GitHub token exchange, CORS `*`, non-JSON GitHub → 502) + `wrangler.toml` + tests.

## GitHub private-repo OAuth — deploy state + how to live-test

Code is built and **was live-tested working** (private repo analyzed end-to-end). But `src/background/service-worker.ts` is intentionally committed with **PLACEHOLDERS** so no secrets ship:
```
GITHUB_CLIENT_ID    = "REPLACE_WITH_CLIENT_ID"
WORKER_EXCHANGE_URL = "https://REPLACE_WITH_WORKER_SUBDOMAIN.workers.dev/exchange"
```
A GitHub OAuth App is already registered (callback `https://<extension-id>.chromiumapp.org/`; the live-test extension id was `faaaopmbgdgipcidiclkecanbckeamkk` — re-load to confirm the current id). The client id/secret are NOT stored in this file.

**To live-test Connect GitHub locally again:**
1. `worker/.dev.vars` (gitignored) with `GITHUB_CLIENT_ID=…` + `GITHUB_CLIENT_SECRET=…`.
2. `cd worker && npx wrangler dev --port 8787 --local`.
3. In `service-worker.ts`, temporarily set `GITHUB_CLIENT_ID` to the real id and `WORKER_EXCHANGE_URL` to `http://localhost:8787/exchange`, `npm run build`, reload the extension.
4. **REVERT both placeholders + delete `worker/.dev.vars` before committing.** (The client_id is public/safe-in-bundle; the localhost URL is the real footgun — it breaks the build for every other user. The secret only ever lives in `.dev.vars`, server-side.)

**For production deploy (user does the deploy; assistant writes code):** `wrangler secret put GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` → `npm run deploy` → put the real `*.workers.dev` URL + real client id into the placeholders (better: source them from Vite env — `.env.production` for the public URL/id, `.env.development` for localhost — so the localhost-in-bundle footgun is structurally impossible). Then publish the extension (Web Store id differs from the unpacked id → update the OAuth callback + tighten worker CORS from `*` to the published `chrome-extension://<id>`).

## Open threads

1. **Production deploy of the OAuth worker + extension publish** — see above. Until then, private-repo OAuth only works via the local `wrangler dev` live-test wiring.
2. **GPT live CORS** — never verified against the real API (mocked only).
3. **X / LinkedIn tabs** — still "Coming soon" stubs.

## Memory

User memory files exist under `~/.claude/projects/.../memory/` (`reach-extension-v1`, `reach-execution-rules`) + `MEMORY.md` index.
