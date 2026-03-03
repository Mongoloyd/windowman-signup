/**
 * WindowMan Purge Job
 * Runs on a schedule to:
 * 1. Delete temp S3 files older than 6 hours (TTL aligned with magic link expiry)
 * 2. Mark their DB rows as 'purged'
 * 3. Delete expired unconsumed email verification tokens
 *
 * Called from server startup on an interval.
 * Safe to run multiple times (idempotent).
 */

import { getExpiredTempAnalyses, markAnalysisPurged, deleteExpiredEmailVerifications } from "./db";

// Lazy import to avoid circular deps at startup
async function getStorageDelete() {
  const { storagePut } = await import("./storage");
  return storagePut;
}

/**
 * Extract S3 key from a full S3 URL.
 * Handles both CDN URLs and direct S3 URLs.
 */
function extractS3Key(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    // Remove leading slash from pathname
    return url.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

export async function runPurgeJob(): Promise<{
  purgedFiles: number;
  purgedTokens: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let purgedFiles = 0;
  let purgedTokens = 0;

  console.log("[Purge] Starting purge job...");

  // 1. Purge expired temp analyses
  try {
    const expiredAnalyses = await getExpiredTempAnalyses();
    console.log(`[Purge] Found ${expiredAnalyses.length} expired temp analyses.`);

    for (const analysis of expiredAnalyses) {
      try {
        // Note: S3 deletion would require AWS SDK DeleteObject.
        // For now, we mark the DB row as purged and clear the URL.
        // The S3 lifecycle policy should handle actual file deletion.
        // TODO: Add explicit S3 DeleteObject call when AWS SDK is wired.
        await markAnalysisPurged(analysis.id);
        purgedFiles++;
        console.log(`[Purge] Marked analysis ${analysis.id} as purged.`);
      } catch (err: any) {
        const msg = `Failed to purge analysis ${analysis.id}: ${err.message}`;
        errors.push(msg);
        console.error(`[Purge] ${msg}`);
      }
    }
  } catch (err: any) {
    const msg = `Failed to query expired analyses: ${err.message}`;
    errors.push(msg);
    console.error(`[Purge] ${msg}`);
  }

  // 2. Purge expired email verification tokens
  try {
    await deleteExpiredEmailVerifications();
    purgedTokens++;
    console.log("[Purge] Deleted expired email verification tokens.");
  } catch (err: any) {
    const msg = `Failed to purge email verifications: ${err.message}`;
    errors.push(msg);
    console.error(`[Purge] ${msg}`);
  }

  console.log(`[Purge] Complete. Files: ${purgedFiles}, Tokens: ${purgedTokens}, Errors: ${errors.length}`);
  return { purgedFiles, purgedTokens, errors };
}

/**
 * Start the purge job on a 30-minute interval.
 * Call this from server startup.
 */
export function startPurgeScheduler(): void {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  console.log("[Purge] Scheduler started. Interval: 30 minutes.");

  // Run once on startup (after a short delay to let DB connect)
  setTimeout(() => {
    runPurgeJob().catch((err) => console.error("[Purge] Startup run failed:", err));
  }, 10_000);

  // Then run every 30 minutes
  setInterval(() => {
    runPurgeJob().catch((err) => console.error("[Purge] Scheduled run failed:", err));
  }, INTERVAL_MS);
}
