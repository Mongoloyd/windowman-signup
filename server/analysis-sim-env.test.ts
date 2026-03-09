import { describe, it, expect } from "vitest";

describe("VITE_ENABLE_ANALYSIS_SIM env var", () => {
  it("should be set to 'true'", () => {
    expect(process.env.VITE_ENABLE_ANALYSIS_SIM).toBe("true");
  });
});
