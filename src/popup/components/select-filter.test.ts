import { describe, it, expect } from "vitest";
import { filterOptions, type SelectOption } from "./select-filter";

const opts: SelectOption[] = [
  { id: "https://github.com/me/reach", label: "me/reach", hint: "Launch assistant" },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6" },
  { id: "deepseek/deepseek-flash", label: "DeepSeek Flash", hint: "Fast and cheap" }
];

describe("filterOptions", () => {
  it("returns everything, in order, for a blank query", () => {
    expect(filterOptions(opts, "  ")).toEqual(opts);
  });
  it("matches the label, ignoring case", () => {
    expect(filterOptions(opts, "KIMI").map((o) => o.label)).toEqual(["Kimi K2.6"]);
  });
  it("matches the id", () => {
    expect(filterOptions(opts, "moonshotai").map((o) => o.label)).toEqual(["Kimi K2.6"]);
  });
  it("matches the hint", () => {
    expect(filterOptions(opts, "cheap").map((o) => o.label)).toEqual(["DeepSeek Flash"]);
  });
});
