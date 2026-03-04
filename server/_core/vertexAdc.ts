/**
 * Vertex AI Application Default Credentials bootstrap.
 *
 * The @google/genai SDK in Vertex AI mode (vertexai: true) uses ADC —
 * it reads GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service
 * account JSON file. This module writes the JSON from the
 * GOOGLE_APPLICATION_CREDENTIALS_JSON secret to a temp file at startup
 * and sets the env var so the SDK can find it.
 *
 * Call bootstrapVertexAdc() once, before any Gemini client is created.
 */

import fs from "fs";
import os from "os";
import path from "path";

let bootstrapped = false;

export function bootstrapVertexAdc(): void {
  if (bootstrapped) return;

  const jsonContent = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!jsonContent) {
    console.warn(
      "[VertexADC] GOOGLE_APPLICATION_CREDENTIALS_JSON is not set. " +
        "Vertex AI calls will fail unless ADC is configured another way."
    );
    return;
  }

  // Validate it parses as JSON before writing
  try {
    JSON.parse(jsonContent);
  } catch {
    console.error("[VertexADC] GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON — skipping ADC bootstrap.");
    return;
  }

  // Write to a temp file
  const tmpPath = path.join(os.tmpdir(), "vertex-sa-key.json");
  fs.writeFileSync(tmpPath, jsonContent, { encoding: "utf-8", mode: 0o600 });

  // Point the SDK to it
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;

  bootstrapped = true;
  console.log(`[VertexADC] Service account credentials written to ${tmpPath}`);
}
