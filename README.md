<div align="center">

# REACH

**You built the thing. REACH helps you tell people about it.**

A Chrome extension that reads your GitHub repo (or README) and writes launch posts for Reddit, X and LinkedIn. For Reddit, it also tells you which subreddits to post in.

</div>

---

## Why I made this

Finishing a project is weirdly the easy part. Then you have to post about it, and that's where I always got stuck.

"Just post it on Reddit" sounds simple until you try. Which subreddit? r/programming will roast you for self-promo. The small niche sub where your actual users hang out? You've probably never heard of it. And once you find it, you're staring at an empty text box trying not to sound like an ad.

So REACH does the two annoying bits for you: finding the right places to post, and writing a first draft that sounds like a person wrote it. You still read it, tweak it and hit post yourself. It doesn't post or schedule anything, and there's no analytics dashboard.

---

## What it does

**1. Reads your project**

Paste a GitHub link or drop in your README. REACH reads it and works out what the project does, who it's for and what words those people would search for.

**2. Finds subreddits (Reddit tab)**

It searches a built-in list of around 32,000 subreddits and picks the ones that fit. It cares more about relevance than size, so a 5k-member niche sub where people will actually see your post beats a 20M-member sub where it sinks in a minute. If your project is about a place ("PC parts in Pakistan"), it'll look for the local communities too.

Pick one and it writes a post for that sub. If it can get the sub's rules, it reads them and warns you when self-promo isn't allowed. Don't want to pick a sub? You can write a general post instead.

**3. Writes the post**

- **Reddit:** a title and body, then a button that opens Reddit's submit page with everything filled in.
- **X:** a single tweet or a thread. Pick a tone (build in public, data-driven, technical or hot take), choose a hook you like, and regenerate any tweet you don't.
- **LinkedIn:** a normal post, or flip on Founder mode to tell it as a personal story ("here's the problem I had, here's what I built").

Close the popup halfway through and nothing's lost. Your project, the subs it found and your drafts are all still there next time.

---

## Bring your own AI key

REACH doesn't have its own AI. You plug in yours, and pretty much anything works.

**Cloud**, where you paste a key:

| Provider | Get a key |
| --- | --- |
| Claude | [platform.claude.com](https://platform.claude.com/settings/keys) |
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| Gemini | [aistudio.google.com](https://aistudio.google.com/apikey). Has a free tier, handy for trying REACH out |
| OpenRouter | [openrouter.ai](https://openrouter.ai/settings/keys). One key gets you hundreds of models |
| DeepSeek, Kimi, Groq, xAI, Mistral, Ollama Cloud | each has a "Get a key" link in settings |

**Local**, running on your own computer, free and private: **Ollama**, **LM Studio**, **llama.cpp** and **vLLM**. Pick one in settings, check the address (the usual one is filled in for you), and pick a model.

**Anything else** that speaks the OpenAI chat API works through **Custom**: paste its address, plus a key if it needs one.

The model dropdown fills itself from whatever the provider says you have access to, and you can search it. Leave it on "Default" if you don't care.

**Chrome will ask for permission** the first time you use a provider ("Allow REACH to reach api.deepseek.com?"). That's on purpose: REACH asks for access to each provider when you pick it, instead of asking for every website at install.

**About your key:** it's saved in your browser on your machine, and it only ever gets sent to the provider you picked. To be honest, it's only scrambled, not properly encrypted, because Chrome extensions don't have a real safe place to keep secrets. Anyone with access to your browser profile could dig it out. So that's fine for a normal personal setup, just don't treat it like a password vault.

---

## Try it

It's not on the Chrome Web Store yet, so for now you load it yourself. It takes about two minutes.

You'll need [Node.js](https://nodejs.org) (version 20 or newer).

```bash
git clone https://github.com/AzaanFaisal606/REACH-Project-Marketing-Assistant.git
cd REACH-Project-Marketing-Assistant
npm install
npm run build
```

That creates a `dist/` folder. Now in Chrome:

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `dist/` folder
4. Pin REACH to your toolbar and click it
5. It'll walk you through adding your key. Then paste a repo link and go.

Making changes? `npm run dev` rebuilds as you edit, and `npm test` runs the tests.

### Running models locally?

LM Studio, llama.cpp and vLLM work as-is. Just start their server. Ollama blocks browser extensions by default, so start it like this:

```bash
# macOS / Linux
OLLAMA_ORIGINS="chrome-extension://*" ollama serve

# Windows (PowerShell)
$env:OLLAMA_ORIGINS="chrome-extension://*"; ollama serve
```

The settings screen has these too, with copy buttons.

### Private repos

Public repos and pasted READMEs work straight away. Private repos need a GitHub login, which takes a little server setup on your side for now. The steps are in [`worker/README.md`](worker/README.md). This will be much simpler in the store version.

---

## How it's put together

It's a small project on purpose:

- **Preact + TypeScript** for the popup
- **Vite** with `@crxjs/vite-plugin` to build the Chrome extension
- **`chrome.storage`** for saving everything. There's no database and no accounts.
- **Two AI adapters** (Claude's own API, and one for everything OpenAI-compatible) plus a list of provider presets, so adding a provider is one entry in a list
- **An offline subreddit list** (`src/lib/reddit/data/`), because Reddit blocks most logged-out requests now. It's rebuilt with `npm run build:subreddits`.
- **A tiny Cloudflare Worker**, only for the private-repo GitHub login
- **Vitest** for tests

```
src/
├── popup/          the UI: tabs, settings, flow state
├── lib/
│   ├── analysis/   reads your project and pulls out the summary
│   ├── providers/  Claude adapter, OpenAI-compatible adapter, provider presets
│   ├── reddit/     subreddit search, ranking, rules, submit links
│   ├── x/          tweets, threads, hashtags
│   ├── linkedin/   LinkedIn posts
│   ├── prompts/    the prompts behind each post type
│   ├── github/     fetching repos
│   └── storage/    saving settings and drafts
└── background/     handles the GitHub login
worker/             the Cloudflare Worker for GitHub login
scripts/            builds the offline subreddit list
```

---

## What's next

- [x] Reddit: find subs, write the post, open the submit page
- [x] X and LinkedIn posts
- [x] Claude, OpenAI, Gemini, OpenRouter, DeepSeek, Kimi and more, plus local models (Ollama, LM Studio, llama.cpp, vLLM)
- [x] Works for people who aren't logged in to Reddit (offline subreddit list)
- [ ] Subreddit rules for every sub, even without a Reddit login
- [ ] Chrome Web Store release
- [ ] Easier private-repo login
- [ ] Learn a subreddit's style from its top posts

---

## Please post responsibly

REACH makes it easy to post in lots of places. Please don't use it to spam. Read each sub's rules (REACH shows them for a reason), post where people will actually care, and reply to the comments. People can tell when someone's just dropping links, and mods will ban you for it.

---

<div align="center">

MIT licensed. Made by [Azaan Faisal](https://github.com/AzaanFaisal606).

</div>
