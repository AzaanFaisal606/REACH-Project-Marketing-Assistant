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
  it("appends the optional user prompt when provided", () => {
    const { user } = buildRedditPrompt(summary, "webdev", rules, "  mention it is open source  ");
    expect(user).toContain("Additional instructions from the user");
    expect(user).toContain("mention it is open source"); // trimmed
  });
  it("omits the user-prompt section when it is blank", () => {
    const { user } = buildRedditPrompt(summary, "webdev", rules, "   ");
    expect(user).not.toContain("Additional instructions from the user");
  });
  it("builds a generic post with no target sub or rules when subreddit is null", () => {
    const { system, user } = buildRedditPrompt(summary, null, rules);
    expect(user).not.toContain("Target subreddit");
    expect(user).not.toContain("Subreddit rules to comply with");
    expect(user).not.toContain("No direct links in title"); // rules not attached
    expect(user).toContain("Turns repos into launch posts"); // project still present
    expect(system).not.toContain("{subreddit}"); // placeholder resolved, not leaked
  });
  it("still honors the optional user prompt for a generic post", () => {
    const { user } = buildRedditPrompt(summary, null, [], "keep it short");
    expect(user).toContain("Additional instructions from the user");
    expect(user).toContain("keep it short");
  });
});
