import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
export const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER ?? "";

if (!accountSid || !authToken) {
  console.warn("[Twilio] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN — SMS/call features disabled.");
}

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Send an SMS message via Twilio.
 */
export async function sendSMS(to: string, body: string): Promise<string> {
  if (!twilioClient) throw new Error("Twilio client not initialized. Check credentials.");
  const message = await twilioClient.messages.create({
    from: TWILIO_FROM,
    to,
    body,
  });
  return message.sid;
}

/**
 * Initiate an outbound call via Twilio with a TwiML response URL.
 */
export async function initiateCall(to: string, twimlUrl: string): Promise<string> {
  if (!twilioClient) throw new Error("Twilio client not initialized. Check credentials.");
  const call = await twilioClient.calls.create({
    from: TWILIO_FROM,
    to,
    url: twimlUrl,
  });
  return call.sid;
}

/**
 * Validate that Twilio credentials are working by fetching the account.
 */
export async function validateCredentials(): Promise<boolean> {
  if (!twilioClient) return false;
  try {
    const account = await twilioClient.api.accounts(accountSid!).fetch();
    return account.status === "active";
  } catch {
    return false;
  }
}
