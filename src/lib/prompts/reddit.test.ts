import { describe, it, expect } from "vitest";
import { buildRedditPrompt } from "./reddit";
import type { ProjectSummary } from "@/lib/analysis/types";
import type { SubredditRule } from "@/lib/reddit/rules";

const summary: ProjectSummary = {
  valueProp: "Turns repos into launch posts",
  targetUser: "indie devs",
  keyFeatures: ["repo input", "reddit discovery"],
  tone: "technical",
  keywords: ["devtools"]
};
const rules: SubredditRule[] = [{ name: "No direct links in title", description: "Title must not contain a URL." }];

describe("buildRedditPrompt", () => {
  it("includes the subreddit, value prop, and rules in the prompt", () => {
    const { system, user } = buildRedditPrompt(summary, "webdev", rules);
    expect(user).toContain("webdev");
    expect(user).toContain("Turns repos into launch posts");
    expect(user).toContain("No direct links in title");
    expect(system.toLowerCase()).toContain("reddit");
  });
  it("instructs JSON output with title and body", () => {
    const { system } = buildRedditPrompt(summary, "webdev", []);
    expect(system).toContain("title");
    expect(system).toContain("body");
  });
});
