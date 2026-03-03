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

  it("should have TWILIO_VERIFY_SERVICE_SID set and starting with VA", () => {
    expect(process.env.TWILIO_VERIFY_SERVICE_SID).toBeTruthy();
    expect(process.env.TWILIO_VERIFY_SERVICE_SID).toMatch(/^VA/);
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

  it("should be able to fetch the Verify service", async () => {
    if (!twilioClient) throw new Error("Twilio client not initialized");
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
    const service = await twilioClient.verify.v2.services(serviceSid).fetch();
    expect(service.sid).toBe(serviceSid);
    expect(service.friendlyName).toBeTruthy();
  }, 15000);
});
