export const BRAIN_VERSION = "3.0.0";

export { EXTRACTION_RUBRIC, GRADING_RUBRIC, USER_PROMPT_TEMPLATE } from "./rubric";

export { ExtractionSignalsJsonSchema, ExtractionSignalsSchema, sanitizeForPrompt } from "./schema";

export { scoreFromSignals, calculateLetterGrade, generateSafePreview, derivePillarStatuses } from "./scoring";

export { generateForensicSummary, extractIdentity } from "./forensic";

export type { ExtractionSignals, AnalysisData, AnalysisContext } from "./schema";

export type { ScoredResult, HardCapResult, SafePreview, PreviewFinding, PillarKey, PillarStatus, PillarStatuses } from "./scoring";

export type { ForensicSummary, ExtractedIdentity } from "./forensic";
