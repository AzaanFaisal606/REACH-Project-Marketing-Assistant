import { describe, it, expect } from "vitest";
import { parseRepoUrl } from "./parse-url";

describe("parseRepoUrl", () => {
  it("parses https URLs", () => {
    expect(parseRepoUrl("https://github.com/owner/repo")).toEqual({ owner: "owner", repo: "repo" });
  });
  it("parses URLs with trailing paths and .git", () => {
    expect(parseRepoUrl("https://github.com/owner/repo.git")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseRepoUrl("https://github.com/owner/repo/tree/main")).toEqual({ owner: "owner", repo: "repo" });
  });
  it("parses owner/repo shorthand", () => {
    expect(parseRepoUrl("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
  });
  it("returns null for non-GitHub input", () => {
    expect(parseRepoUrl("not a url")).toBeNull();
  });
});
