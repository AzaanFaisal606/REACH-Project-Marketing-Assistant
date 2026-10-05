import { describe, it, expect, vi } from "vitest";
import { TWEET_MAX, generateXHooks, generateXPostTweets, regenerateXTweet } from "./generate";
import type { ProjectSummary } from "@/lib/analysis/types";
import type { Provider, ProviderConfig, GenerateInput } from "@/lib/providers/types";

const summary: ProjectSummary = {
  valueProp: "v", targetUser: "u", keyFeatures: ["f"], tone: "t", keywords: ["k"]
};
const provider = {} as Provider;
const config: ProviderConfig = { label: "Fake", baseUrl: "", model: "m" };
const genReturning = (raw: string) =>
  vi.fn(async (_p: Provider, _i: GenerateInput, _c: ProviderConfig) => raw);

describe("TWEET_MAX", () => {
  it("is 280", () => expect(TWEET_MAX).toBe(280));
});

describe("generateXHooks", () => {
  it("parses a plain { hooks } array", async () => {
    const gen = genReturning('{ "hooks": ["a", "b", "c"] }');
    expect(await generateXHooks(summary, "buildinpublic", "", provider, config, gen)).toEqual(["a", "b", "c"]);
  });
  it("parses hooks from fenced JSON", async () => {
    const gen = genReturning('```json\n{ "hooks": ["x","y","z"] }\n```');
    expect(await generateXHooks(summary, "technical", "", provider, config, gen)).toEqual(["x", "y", "z"]);
  });
});

describe("generateXPostTweets", () => {
  it("parses a single-tweet array", async () => {
    const gen = genReturning('{ "tweets": ["only tweet"] }');
    expect(await generateXPostTweets(summary, "tweet", "datadriven", [], "", "", provider, config, gen))
      .toEqual(["only tweet"]);
  });
  it("parses a thread array from JSON with surrounding prose", async () => {
    const gen = genReturning('Sure: { "tweets": ["t1","t2","t3"] } done');
    expect(await generateXPostTweets(summary, "thread", "technical", ["#x"], "hook", "", provider, config, gen))
      .toEqual(["t1", "t2", "t3"]);
  });
  it("throws on malformed JSON", async () => {
    const gen = genReturning("not json");
    await expect(generateXPostTweets(summary, "tweet", "technical", [], "", "", provider, config, gen)).rejects.toThrow();
  });
});

describe("regenerateXTweet", () => {
  it("parses a single { tweet } string", async () => {
    const gen = genReturning('{ "tweet": "rewritten" }');
    expect(await regenerateXTweet(summary, "hottake", ["a", "b", "c"], 1, "", provider, config, gen))
      .toBe("rewritten");
  });
});
