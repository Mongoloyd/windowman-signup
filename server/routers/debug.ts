import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  scoreFromSignals,
  generateSafePreview,
  generateForensicSummary,
  extractIdentity,
} from "../scanner-brain/index";
import { ExtractionSignalsSchema } from "../scanner-brain/schema";

export const debugRouter = router({
  /**
   * runScoring — accepts raw ExtractionSignals, runs the full scoring
   * pipeline server-side, and returns scored + preview + forensic + identity.
   * Admin-only to protect proprietary logic.
   */
  runScoring: adminProcedure
    .input(
      z.object({
        signals: ExtractionSignalsSchema,
      })
    )
    .mutation(({ input }) => {
      const { signals } = input;
      const scored = scoreFromSignals(signals);
      const preview = generateSafePreview(scored);
      const forensic = generateForensicSummary(scored, signals);
      const identity = extractIdentity(signals);

      return {
        scored,
        preview,
        forensic,
        identity,
      };
    }),
});
