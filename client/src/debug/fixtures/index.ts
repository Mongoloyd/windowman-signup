/**
 * Analysis Theater Simulator — Fixture Registry
 *
 * DEV-ONLY. These fixtures are used exclusively by the AnalysisTheaterSimulator
 * debug page. They contain no real user data and trigger no side effects.
 */
import type { ScoredResult } from "@shared/scoredTypes";

import { FIXTURE_GRADE_A_CLEAN, FIXTURE_GRADE_A_CLEAN_SIGNALS } from "./grade-a-clean";
import { FIXTURE_GRADE_C_MIXED, FIXTURE_GRADE_C_MIXED_SIGNALS } from "./grade-c-mixed";
import { FIXTURE_GRADE_F_CRITICAL, FIXTURE_GRADE_F_CRITICAL_SIGNALS } from "./grade-f-critical";
import { FIXTURE_LOW_CONFIDENCE, FIXTURE_LOW_CONFIDENCE_SIGNALS } from "./low-confidence";

export interface FixtureEntry {
  id: string;
  label: string;
  description: string;
  scored: ScoredResult;
  signals: Record<string, unknown>;
}

export const FIXTURES: FixtureEntry[] = [
  {
    id: "grade-a-clean",
    label: "Grade A — Clean",
    description: "Near-perfect quote. All pillars pass. No warnings or flags.",
    scored: FIXTURE_GRADE_A_CLEAN,
    signals: FIXTURE_GRADE_A_CLEAN_SIGNALS,
  },
  {
    id: "grade-c-mixed",
    label: "Grade C — Mixed",
    description: "Mediocre quote. Price flagged, fine print warned. Overcharge detected.",
    scored: FIXTURE_GRADE_C_MIXED,
    signals: FIXTURE_GRADE_C_MIXED_SIGNALS,
  },
  {
    id: "grade-f-critical",
    label: "Grade F — Critical",
    description: "Terrible quote. Hard cap applied. Multiple critical violations.",
    scored: FIXTURE_GRADE_F_CRITICAL,
    signals: FIXTURE_GRADE_F_CRITICAL_SIGNALS,
  },
  {
    id: "low-confidence",
    label: "Low Confidence",
    description: "Poor OCR quality. All pillars warn. Scores cluster near 50.",
    scored: FIXTURE_LOW_CONFIDENCE,
    signals: FIXTURE_LOW_CONFIDENCE_SIGNALS,
  },
];

export function getFixtureById(id: string): FixtureEntry | undefined {
  return FIXTURES.find((f) => f.id === id);
}
