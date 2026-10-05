import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  // Anything importing popup state also loads the 7.5 MB bundled subreddit list
  // (src/lib/reddit/data), which can exceed the 5 s default under parallel load.
  // Lazy-loading that list (docs/tasklist.md) would remove the need for this.
  test: { environment: "jsdom", globals: true, testTimeout: 20000 },
  resolve: { alias: { "@": "/src" } }
});
