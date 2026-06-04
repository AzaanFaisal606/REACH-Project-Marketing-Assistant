<div align="center">

# REACH

**Your repo, turned into a launch post — and pointed at the people who'll actually care.**

Point REACH at a GitHub repo or drop in a README. It reads the project, figures out *who it's for and where they hang out*, and writes a Reddit post that doesn't sound like it came out of a content mill. You bring your own AI key; nothing leaves your machine except the call to your model.

</div>

---

## Why this exists

Shipping the thing is the easy part. Getting the first hundred people to see it is the part nobody warns you about.

The usual advice — "post it on Reddit!" — falls apart the moment you try. Which subreddit? r/programming will eat you alive for self-promo. The niche one with 4,000 members is where your users actually are, but you've never heard of it. And once you find it, you're staring at an empty title box trying to write something that doesn't read like an ad.

REACH is the part between "it's done" and "people are using it." It does the two things that are genuinely hard to do well: **finding the right rooms**, and **writing something worth posting in them**.

It does *not* try to be a social-media suite. No scheduling, no analytics dashboards, no "growth hacking." The whole moat is the input (your actual code) and the targeting (where to post) — the writing on top of that is the easy 20%.

---

## What it does

> **Note:** Reddit is the only fully-built channel right now. X and LinkedIn are stubbed as "coming soon" — the post-generation engine is shared, so they're wiring, not rewrites.

**1 · Understand the project**
Feed it a public GitHub repo, a private one (via GitHub OAuth), or just paste a README. REACH pulls the metadata and readme, then has your model distil it into a structured summary — value prop, target user, key features, tone, and a set of search keywords *grouped by axis* (topic, audience, geography, platform).

**2 · Find the communities**
This is the part most "post to Reddit" tools get lazy about. REACH searches Reddit per keyword-axis and ranks the results with a heuristic that deliberately **de-weights raw subscriber count** — a 12-million-member megasub where your post drowns is worth less than a focused one where it's seen. It also reserves a slot for *geography*: if your project is "a PC-parts marketplace for Pakistan," it won't just hand you r/buildapc — it'll surface the Pakistani PC community too.

**3 · Write the post**
Pick a community. REACH pulls that subreddit's rules, warns you if it restricts self-promotion, and generates a title + body tuned to fit — problem-first, dev-voiced, no link stuffed in the title. Edit inline, then jump straight to Reddit's submit page with everything pre-filled.

Closed the popup mid-flow? It remembers. Your summary, the communities you found, and your draft are all there when you reopen — so you can post to one subreddit today and come back for the next without re-running anything.

---

## Bring your own key (and keep it)

REACH has **no backend that ever sees your data.** You plug in your own API key for one of:

| Provider | Model | Status |
| --- | --- | --- |
| **Anthropic** | Claude | ✅ verified |
| **Google** | Gemini | ✅ verified |
| **OpenAI** | GPT | ⚙️ adapter built, identical pattern |

Your key is stored in `chrome.storage.local` on your own machine, lightly obfuscated. To be completely honest about that: **obfuscation is not encryption.** MV3 extensions have no secure keystore, so anything stored client-side is recoverable by someone with access to your browser profile. It's good enough to keep your key out of plain sight; it is not a vault. The extension tells you this in the UI too — no surprises.

The *only* server-side component is an optional, tiny Cloudflare Worker that exists for one reason: GitHub OAuth for private repos requires a client secret, and a client secret can't live in a public extension. The Worker does the token exchange and nothing else. If you only ever use public repos or pasted READMEs, you don't need it at all.

---

## Run it locally

REACH isn't on the Chrome Web Store (yet). Building from source takes a couple of minutes.

```bash
git clone <this-repo>
cd REACH
npm install
npm run build      # outputs to dist/
```

Then load it into Chrome:

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top-right)
3. Click **Load unpacked** and select the `dist/` folder
4. Pin REACH, open it, hit the ⚙️ and paste your API key

For live development with hot-reload, use `npm run dev` instead of `build`.

### Optional — private GitHub repos

Only needed if you want to analyze private repositories. The flow lives in [`worker/`](worker/) — register a GitHub OAuth app, deploy the Worker, and drop the client ID + Worker URL into the two placeholder constants in `src/background/service-worker.ts`. Step-by-step is in [`worker/README.md`](worker/README.md).

---

## How it's built

A deliberately small stack — it's a popup, not a platform.

- **Preact + TypeScript** — the entire UI and flow state live in the popup; signals for reactivity.
- **Vite + `@crxjs/vite-plugin`** — MV3 bundling that actually works on Vite 8.
- **`chrome.storage.local`** — all persistence. No database, no accounts.
- **A provider adapter layer** — each AI provider is a small module behind one interface, so adding another (Grok, a local model, OpenRouter) is one file, not a refactor.
- **Reddit's public JSON endpoints** — search and rules, called politely (sequential, rate-limit aware) straight from the browser.
- **One Cloudflare Worker** — GitHub OAuth token exchange, and that's it.
- **Vitest** — the logic (analysis parsing, ranking, query planning, storage) is covered by ~90 tests.

```
src/
├── popup/          UI, components, flow state
├── lib/
│   ├── analysis/   repo/README → structured summary
│   ├── providers/  Claude · Gemini · GPT adapters
│   ├── reddit/     search, ranking, rules, submit-URL
│   ├── github/     repo fetch + URL parsing
│   └── storage/    chrome.storage wrapper + key obfuscation
└── background/     service worker (OAuth handoff)
worker/             Cloudflare Worker for GitHub OAuth
```

---

## Roadmap

- [x] Reddit: discover → rank → generate → post
- [x] BYOK with Claude, Gemini, GPT
- [x] Public + private (OAuth) GitHub repos
- [x] Geography-aware community ranking
- [ ] AI-assisted community re-ranking (heuristic recall → model precision)
- [ ] X (Twitter) channel
- [ ] LinkedIn channel
- [ ] Sampling a subreddit's top posts to match its tone

---

## A note on responsible posting

REACH makes it easy to post in a lot of places. That's a double-edged sword. It surfaces a subreddit's rules and flags self-promo restrictions *before* you post for a reason — please read them. The goal is to help you reach the communities that genuinely want to hear about what you built, not to spray links. Communities notice the difference, and so do the people in them.

---

<div align="center">

**MIT licensed.** Built by [Azaan Faisal](https://github.com/AzaanFaisal606).

</div>
