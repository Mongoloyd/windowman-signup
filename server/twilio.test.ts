import { describe, expect, it } from "vitest";
import { validateCredentials, twilioClient, TWILIO_FROM } from "./twilio";

describe("Twilio credentials", () => {
  it("should have TWILIO_ACCOUNT_SID set", () => {
    expect(process.env.TWILIO_ACCOUNT_SID).toBeTruthy();
    expect(process.env.TWILIO_ACCOUNT_SID).toMatch(/^AC/);
  });

  it("should have TWILIO_AUTH_TOKEN set", () => {
    expect(process.env.TWILIO_AUTH_TOKEN).toBeTruthy();
    expect(process.env.TWILIO_AUTH_TOKEN!.length).toBeGreaterThan(10);
  });

  it("should have TWILIO_PHONE_NUMBER set", () => {
    expect(process.env.TWILIO_PHONE_NUMBER).toBeTruthy();
  });

  it("should initialize the Twilio client", () => {
    expect(twilioClient).not.toBeNull();
  });

  it("should have a valid TWILIO_FROM phone number", () => {
    expect(TWILIO_FROM).toBeTruthy();
  });

  it("should validate credentials against the Twilio API", async () => {
    const isValid = await validateCredentials();
    expect(isValid).toBe(true);
  }, 15000);
});
