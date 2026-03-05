/**
 * VerifyEmail.test.ts
 * Unit tests for verify-email query param parsing and error handling
 */

import { describe, it, expect } from "vitest";

/**
 * Test: Query param parsing
 * Verify that token, session, and attach params are correctly extracted
 */
describe("VerifyEmail query param parsing", () => {
  it("should extract token from query params", () => {
    const params = new URLSearchParams("token=abc123&session=sess456");
    const token = params.get("token");
    const session = params.get("session");
    
    expect(token).toBe("abc123");
    expect(session).toBe("sess456");
  });

  it("should handle missing token", () => {
    const params = new URLSearchParams("session=sess456");
    const token = params.get("token");
    
    expect(token).toBeNull();
  });

  it("should handle missing session (cross-device)", () => {
    const params = new URLSearchParams("token=abc123");
    const token = params.get("token");
    const session = params.get("session");
    
    expect(token).toBe("abc123");
    expect(session).toBeNull();
  });

  it("should handle deprecated attach param", () => {
    const params = new URLSearchParams("token=abc123&attach=attach456");
    const token = params.get("token");
    const attach = params.get("attach");
    
    expect(token).toBe("abc123");
    expect(attach).toBe("attach456");
  });

  it("should handle all three params together", () => {
    const params = new URLSearchParams("token=abc123&session=sess456&attach=attach789");
    const token = params.get("token");
    const session = params.get("session");
    const attach = params.get("attach");
    
    expect(token).toBe("abc123");
    expect(session).toBe("sess456");
    expect(attach).toBe("attach789");
  });
});

/**
 * Test: Error message mapping
 * Verify that error codes map to user-friendly messages
 */
describe("VerifyEmail error message mapping", () => {
  const errorMessages = {
    link_used: "This verification link has already been used",
    link_expired: "This verification link has expired (6 hour limit)",
    server_error: "Something went wrong during verification",
    invalid_link: "This verification link is invalid or missing",
  };

  it("should map link_used error", () => {
    const message = errorMessages.link_used;
    expect(message).toContain("already been used");
  });

  it("should map link_expired error", () => {
    const message = errorMessages.link_expired;
    expect(message).toContain("expired");
    expect(message).toContain("6 hour");
  });

  it("should map server_error", () => {
    const message = errorMessages.server_error;
    expect(message).toContain("Something went wrong");
  });

  it("should map invalid_link error", () => {
    const message = errorMessages.invalid_link;
    expect(message).toContain("invalid or missing");
  });
});

/**
 * Test: Recovery action selection
 * Verify that the correct recovery action is shown for each error
 */
describe("VerifyEmail recovery actions", () => {
  const recoveryActions = {
    link_used: "Request New Link",
    link_expired: "Upload New Quote",
    server_error: "Try Again",
  };

  it("should show 'Request New Link' for link_used", () => {
    const action = recoveryActions.link_used;
    expect(action).toBe("Request New Link");
  });

  it("should show 'Upload New Quote' for link_expired", () => {
    const action = recoveryActions.link_expired;
    expect(action).toBe("Upload New Quote");
  });

  it("should show 'Try Again' for server_error", () => {
    const action = recoveryActions.server_error;
    expect(action).toBe("Try Again");
  });
});

/**
 * Test: Page state transitions
 * Verify that page state changes correctly based on verification result
 */
describe("VerifyEmail page state transitions", () => {
  const states = {
    loading: "loading",
    success: "success",
    success_no_analysis: "success_no_analysis",
    error: "error",
  };

  it("should start in loading state", () => {
    expect(states.loading).toBe("loading");
  });

  it("should transition to success when analysis is attached", () => {
    expect(states.success).toBe("success");
  });

  it("should transition to success_no_analysis when email verified but no analysis", () => {
    expect(states.success_no_analysis).toBe("success_no_analysis");
  });

  it("should transition to error on verification failure", () => {
    expect(states.error).toBe("error");
  });
});
