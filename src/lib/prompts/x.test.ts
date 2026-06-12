import { describe, it, expect } from "vitest";
import { buildXHooksPrompt, buildXPrompt, buildXTweetRegenPrompt } from "./x";
import type { ProjectSummary } from "@/lib/analysis/types";

const summary: ProjectSummary = {
  valueProp: "Turns repos into launch posts",
  targetUser: "indie devs",
  keyFeatures: ["repo input", "post generation"],
  tone: "technical",
  keywords: ["devtools"]
};

describe("buildXHooksPrompt", () => {
  it("asks for exactly 3 hook variants as JSON", () => {
    const { system } = buildXHooksPrompt(summary, "buildinpublic");
    expect(system).toContain('"hooks"');
    expect(system).toMatch(/three|3/i);
  });

  it("names the three hook angles", () => {
    const { system } = buildXHooksPrompt(summary, "datadriven");
    expect(system.toLowerCase()).toContain("curiosity");
    expect(system.toLowerCase()).toContain("stat");
    expect(system.toLowerCase()).toContain("story");
  });

  it("includes the project facts and the tone block", () => {
    const { system, user } = buildXHooksPrompt(summary, "hottake");
    expect(user).toContain("Turns repos into launch posts");
    expect(system).toContain("contrarian");
  });

  it("appends trimmed user steering when provided", () => {
    const { user } = buildXHooksPrompt(summary, "technical", "  aim at backend devs  ");
    expect(user).toContain("Additional instructions from the user");
    expect(user).toContain("aim at backend devs");
  });
});

describe("buildXPrompt", () => {
  it("requests a tweets array and enforces 280 awareness", () => {
    const { system } = buildXPrompt(summary, "tweet", "buildinpublic", ["#buildinpublic"]);
    expect(system).toContain('"tweets"');
    expect(system).toContain("280");
  });

  it("adds the thread structure block only for threads", () => {
    const thread = buildXPrompt(summary, "thread", "technical", ["#devtools"], "My bold hook");
    const tweet = buildXPrompt(summary, "tweet", "technical", ["#devtools"]);
    expect(thread.system).toContain("Tweet 1");
    expect(tweet.system).not.toContain("Tweet 1");
  });

  it("injects the selected hook into the thread user message", () => {
    const { user } = buildXPrompt(summary, "thread", "datadriven", ["#saas"], "Everyone ships too late");
    expect(user).toContain("Everyone ships too late");
  });

  it("does NOT inject a hook into a single-tweet user message even if one is passed", () => {
    const { user } = buildXPrompt(summary, "tweet", "technical", ["#x"], "Everyone ships too late");
    expect(user).not.toContain("Everyone ships too late");
    expect(user).not.toContain("Use this exact hook");
  });

  it("instructs the model to pick 1-2 hashtags from the provided list", () => {
    const { system, user } = buildXPrompt(summary, "tweet", "technical", ["#typescript", "#devtools"]);
    expect(system).toMatch(/1[\s–-]*2 hashtags/i);
    expect(user).toContain("#typescript");
    expect(user).toContain("#devtools");
  });

  it("contains the selected tone block", () => {
    expect(buildXPrompt(summary, "tweet", "buildinpublic", []).system.toLowerCase()).toContain("build in public");
    expect(buildXPrompt(summary, "tweet", "hottake", []).system.toLowerCase()).toContain("contrarian");
  });
});

describe("buildXTweetRegenPrompt", () => {
  it("sends the full thread, the target index, and asks for a single replacement tweet", () => {
    const tweets = ["hook tweet", "body tweet", "cta tweet"];
    const { system, user } = buildXTweetRegenPrompt(summary, "technical", tweets, 1);
    expect(system).toContain('"tweet"');
    expect(user).toContain("hook tweet");
    expect(user).toContain("body tweet");
    expect(user).toMatch(/tweet 2|index 1|position 2/i);
  });
});
