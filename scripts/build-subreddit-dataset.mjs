// Build the bundled offline subreddit dataset from the raw Kaggle CSV.
//
// WHY THIS EXISTS: Reddit killed unauthenticated .json endpoints (403 as of
// May 2026), so the live-fetch community search no longer works on machines
// without a trusted reddit.com session. We ship a pruned, offline snapshot
// instead and rank against it in-memory.
//
// INPUT:  subreddits.csv.zip  (raw Kaggle dump, ~33MB unzipped, 185k rows,
//         columns: name,type,title,description,subscribers,nsfw,quarantined,
//         color,img_banner,img_icon,created_at,updated_at)
// OUTPUT: src/lib/reddit/data/subreddits.json  (pruned, projected columns)
//
// PRUNE FILTERS (mirror rank.ts so the offline set == what ranking would keep):
//   - type must be "public"      (drop banned / restricted / private / archived)
//   - subscribers >= 1000        (MIN_SUBSCRIBERS in rank.ts)
//   - title OR description non-empty  (need SOMETHING to keyword-match on; many
//                                 big, highly relevant subs like r/MachineLearning
//                                 have an empty description but a usable title)
//   - not NSFW                    (nsfw flag OR NSFW_WORDS substring, per rank.ts)
//
// Run:  npm run build:subreddits   (or: node scripts/build-subreddit-dataset.mjs)

import { existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ZIP = join(ROOT, "subreddits.csv.zip");
const OUT_DIR = join(ROOT, "src", "lib", "reddit", "data");
const OUT = join(OUT_DIR, "subreddits.json");

// Keep in lockstep with rank.ts.
const MIN_SUBSCRIBERS = 1000;
const NSFW_WORDS = [
  "nsfw", "porn", "hentai", "rule34", "gonewild", "xxx",
  "nude", "nudes", "boobs", "milf", "fetish", "camgirl", "onlyfans"
];

function isNsfwText(name, title, description) {
  const hay = `${name} ${title} ${description}`.toLowerCase();
  return NSFW_WORDS.some((w) => hay.includes(w));
}

// Minimal RFC-4180 CSV parser fed one chunk of text at a time. Handles quoted
// fields containing commas, newlines, and escaped "" quotes. Emits complete
// records via onRecord; carries an incomplete trailing record between chunks.
function makeCsvParser(onRecord) {
  let field = "";
  let record = [];
  let inQuotes = false;
  let quoteJustClosed = false;

  return {
    push(chunk) {
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i];
        if (inQuotes) {
          if (ch === '"') {
            if (chunk[i + 1] === '"') { field += '"'; i++; }
            else { inQuotes = false; }
          } else {
            field += ch;
          }
          continue;
        }
        if (ch === '"' && field === "") { inQuotes = true; continue; }
        if (ch === ",") { record.push(field); field = ""; continue; }
        if (ch === "\r") continue;
        if (ch === "\n") {
          record.push(field); field = "";
          onRecord(record);
          record = [];
          continue;
        }
        field += ch;
      }
    },
    end() {
      if (field !== "" || record.length > 0) {
        record.push(field);
        onRecord(record);
      }
    }
  };
}

async function main() {
  if (!existsSync(ZIP)) {
    console.error(`Missing ${ZIP} — place the raw Kaggle subreddits.csv.zip in the project root.`);
    process.exit(1);
  }

  const { spawn } = await import("node:child_process");
  const unzip = spawn("unzip", ["-p", ZIP], { stdio: ["ignore", "pipe", "inherit"] });

  let header = null;
  let idx = {};
  let total = 0;
  let kept = 0;
  const out = [];

  const parser = makeCsvParser((rec) => {
    if (!header) {
      header = rec;
      header.forEach((h, i) => { idx[h.trim()] = i; });
      return;
    }
    total++;
    const type = (rec[idx.type] ?? "").trim();
    if (type !== "public") return;

    const subsRaw = (rec[idx.subscribers] ?? "").trim();
    const subscribers = subsRaw === "" ? 0 : parseInt(subsRaw, 10);
    if (!Number.isFinite(subscribers) || subscribers < MIN_SUBSCRIBERS) return;

    const description = (rec[idx.description] ?? "").trim();
    const name = (rec[idx.name] ?? "").trim();
    const title = (rec[idx.title] ?? "").trim();
    // Need at least a title OR a description to match on. Dropping empty-desc
    // rows outright would nuke big relevant subs (r/MachineLearning, r/deeplearning)
    // whose description is blank but whose title is exactly the topic.
    if (title === "" && description === "") return;

    const nsfwFlag = (rec[idx.nsfw] ?? "").trim().toLowerCase() === "t";
    if (nsfwFlag || isNsfwText(name, title, description)) return;

    kept++;
    out.push({ name, title, description, subscribers });
  });

  unzip.stdout.setEncoding("utf8");
  unzip.stdout.on("data", (chunk) => parser.push(chunk));

  await new Promise((resolve, reject) => {
    unzip.stdout.on("end", () => { parser.end(); resolve(); });
    unzip.on("error", reject);
  });

  // Sort by subscribers desc — deterministic output, and larger/more-established
  // subs first is a sane default before ranking narrows things.
  out.sort((a, b) => b.subscribers - a.subscribers);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, JSON.stringify(out), "utf8");

  const bytes = Buffer.byteLength(JSON.stringify(out));
  console.log(`Rows scanned:   ${total}`);
  console.log(`Rows kept:      ${kept}`);
  console.log(`Output:         ${OUT}`);
  console.log(`Output size:    ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
