import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { Welcome } from "./Welcome";
import { getPreset } from "@/lib/providers/presets";

describe("Welcome", () => {
  it("links to the main providers' key pages and the local apps, and opens settings", () => {
    const onSetup = vi.fn();
    const { getByText, container } = render(<Welcome onSetup={onSetup} />);
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const id of ["claude", "openai", "gemini", "openrouter", "ollama", "lmstudio"]) {
      expect(hrefs).toContain(getPreset(id)!.keyUrl);
    }
    fireEvent.click(getByText("Set up my AI provider"));
    expect(onSetup).toHaveBeenCalledOnce();
  });
});
