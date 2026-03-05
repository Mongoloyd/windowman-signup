/**
 * reportPdf.test.ts
 * Unit tests for PDF filename sanitization and risk level computation
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeFilenamePart,
  generateReportFilename,
  computeRiskLevel,
} from "./reportPdf";

describe("reportPdf utilities", () => {
  describe("sanitizeFilenamePart", () => {
    it("should convert to lowercase", () => {
      expect(sanitizeFilenamePart("ABC Window Co.")).toContain("abc");
    });

    it("should replace special characters with dashes", () => {
      const result = sanitizeFilenamePart("ABC Window & Door Co.");
      expect(result).not.toContain("&");
      expect(result).not.toContain(".");
    });

    it("should remove leading/trailing dashes", () => {
      const result = sanitizeFilenamePart("---ABC---");
      expect(result).not.toMatch(/^-/);
      expect(result).not.toMatch(/-$/);
    });

    it("should handle empty string", () => {
      const result = sanitizeFilenamePart("");
      expect(result).toBe("");
    });

    it("should limit length to 50 chars", () => {
      const longName = "A".repeat(100);
      const result = sanitizeFilenamePart(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("should handle real contractor names", () => {
      const result = sanitizeFilenamePart("Smith & Sons Window Replacement LLC");
      expect(result).toBe("smith-sons-window-replacement-llc");
    });
  });

  describe("generateReportFilename", () => {
    it("should generate correct filename format", () => {
      const filename = generateReportFilename("ABC Window Co", "12345678-abcd-1234-abcd-1234567890ab");
      expect(filename).toBe("windowman-quote-audit-abc-window-co-12345678.pdf");
    });

    it("should handle empty contractor name", () => {
      const filename = generateReportFilename("", "12345678-abcd-1234-abcd-1234567890ab");
      expect(filename).toContain("windowman-quote-audit-quote");
      expect(filename).toMatch(/\.pdf$/);
    });

    it("should use first 8 chars of UUID", () => {
      const filename = generateReportFilename("Test", "abcdefgh-ijkl-mnop-qrst-uvwxyz123456");
      expect(filename).toContain("-abcdefgh.pdf");
    });

    it("should end with .pdf extension", () => {
      const filename = generateReportFilename("Test", "12345678-abcd-1234-abcd-1234567890ab");
      expect(filename).toMatch(/\.pdf$/);
    });
  });

  describe("computeRiskLevel", () => {
    it("should return 'critical' for score < 50", () => {
      expect(computeRiskLevel(0)).toBe("critical");
      expect(computeRiskLevel(25)).toBe("critical");
      expect(computeRiskLevel(49)).toBe("critical");
    });

    it("should return 'moderate' for score 50-74", () => {
      expect(computeRiskLevel(50)).toBe("moderate");
      expect(computeRiskLevel(60)).toBe("moderate");
      expect(computeRiskLevel(74)).toBe("moderate");
    });

    it("should return 'acceptable' for score >= 75", () => {
      expect(computeRiskLevel(75)).toBe("acceptable");
      expect(computeRiskLevel(85)).toBe("acceptable");
      expect(computeRiskLevel(100)).toBe("acceptable");
    });

    it("should handle boundary values correctly", () => {
      expect(computeRiskLevel(49.9)).toBe("critical");
      expect(computeRiskLevel(50)).toBe("moderate");
      expect(computeRiskLevel(74.9)).toBe("moderate");
      expect(computeRiskLevel(75)).toBe("acceptable");
    });
  });
});
