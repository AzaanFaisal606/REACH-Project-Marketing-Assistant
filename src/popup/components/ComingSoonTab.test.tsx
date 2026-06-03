import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { ComingSoonTab } from "../tabs/ComingSoonTab";

describe("ComingSoonTab", () => {
  it("shows the platform name and coming soon", () => {
    const { getByText } = render(<ComingSoonTab platform="X" />);
    expect(getByText(/X/)).toBeTruthy();
    expect(getByText(/coming soon/i)).toBeTruthy();
  });
});
