import { describe, it, expect } from "vitest";
import { buildLinkedInPrompt } from "./linkedin";
import type { ProjectSummary } from "@/lib/analysis/types";

const summary: ProjectSummary = {
  valueProp: "Turns repos into launch posts",
  targetUser: "indie devs",
  keyFeatures: ["repo input", "post generation"],
  tone: "technical",
  keywords: ["devtools"]
};

describe("buildLinkedInPrompt", () => {
  it("enforces the post structure and JSON post output in the system message", () => {
    const { system } = buildLinkedInPrompt(summary, false);
    expect(system).toContain("STRUCTURE");
    expect(system).toContain("Hook");
    expect(system).toContain("Hashtags");
    expect(system).toContain('{ "post"');
    expect(system).toContain("3000");
  });

  it("includes the project facts in the user message", () => {
    const { user } = buildLinkedInPrompt(summary, false);
    expect(user).toContain("Turns repos into launch posts");
    expect(user).toContain("indie devs");
    expect(user).toContain("repo input");
    expect(user).toContain("technical");
  });

  it("appends the FOUNDER MODE block only when founderMode is true", () => {
    expect(buildLinkedInPrompt(summary, true).system).toContain("FOUNDER MODE");
    expect(buildLinkedInPrompt(summary, false).system).not.toContain("FOUNDER MODE");
  });

  it("appends the optional user prompt when provided, trimmed", () => {
    const { user } = buildLinkedInPrompt(summary, false, "  target CTOs at startups  ");
    expect(user).toContain("Additional instructions from the user");
    expect(user).toContain("target CTOs at startups");
  });

  it("omits the user-prompt section when blank", () => {
    const { user } = buildLinkedInPrompt(summary, false, "   ");
    expect(user).not.toContain("Additional instructions from the user");
  });
});
