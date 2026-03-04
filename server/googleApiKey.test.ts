/**
 * Validates that GOOGLE_APPLICATION_CREDENTIALS_JSON is set and accepted
 * by the Gemini API via Vertex AI (ADC mode).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { GoogleGenAI } from "@google/genai";
import { bootstrapVertexAdc } from "./_core/vertexAdc";

const VERTEX_PROJECT = "gen-lang-client-0516998301";
const VERTEX_LOCATION = "global";
const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

beforeAll(() => {
  bootstrapVertexAdc();
});

describe("Vertex AI credential validation", () => {
  it("should have GOOGLE_APPLICATION_CREDENTIALS_JSON set in environment", () => {
    const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ?? "";
    expect(json.length, "GOOGLE_APPLICATION_CREDENTIALS_JSON must be non-empty").toBeGreaterThan(0);
    // Validate it parses as JSON
    expect(() => JSON.parse(json), "GOOGLE_APPLICATION_CREDENTIALS_JSON must be valid JSON").not.toThrow();
  });

  it("should have GOOGLE_APPLICATION_CREDENTIALS set after ADC bootstrap", () => {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";
    expect(credPath.length, "GOOGLE_APPLICATION_CREDENTIALS must be set after bootstrapVertexAdc()").toBeGreaterThan(0);
  });

  it("should successfully call Gemini via Vertex AI with ADC", async () => {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";
    expect(credPath.length).toBeGreaterThan(0);

    const ai = new GoogleGenAI({
      vertexai: true,
      project: VERTEX_PROJECT,
      location: VERTEX_LOCATION,
    });

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: "Reply with the single word: OK" }] }],
    });

    const text = result.text ?? "";
    expect(text.length, "Gemini should return a non-empty response").toBeGreaterThan(0);
    console.log("[VertexAI Test] Response:", text.trim());
  }, 30_000);
});
