/**
 * WindowMan Email Service
 * Uses Resend for transactional email delivery.
 * Modular — swap provider by replacing this file.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "WindowMan <noreply@itswindowman.com>";

export interface SendMagicLinkOptions {
  to: string;
  magicLinkUrl: string;
  /** Optional: attach token for cross-device file attach */
  tempAttachToken?: string | null;
}

/**
 * Send the email verification magic link.
 * The link expires in 6 hours (aligned with temp upload TTL).
 */
export async function sendMagicLinkEmail(opts: SendMagicLinkOptions): Promise<void> {
  const { to, magicLinkUrl, tempAttachToken } = opts;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email — WindowMan</title>
</head>
<body style="margin:0;padding:0;background:#0F1419;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1419;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#131D2A;border-radius:12px;border:1px solid rgba(0,217,255,0.15);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(0,217,255,0.08);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#00D9FF;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                    Window<span style="color:#ffffff;">Man</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;color:#94A3B8;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Verify Your Email</p>
              <h1 style="margin:0 0 16px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">
                Your analysis is ready to unlock.
              </h1>
              <p style="margin:0 0 28px;color:#94A3B8;font-size:15px;line-height:1.6;">
                Click the button below to verify your email and access your WindowMan analysis preview. This link expires in <strong style="color:#E2E8F0;">6 hours</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#00D9FF;border-radius:8px;">
                    <a href="${magicLinkUrl}" style="display:inline-block;padding:14px 32px;color:#0F1419;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                      ✓ Verify Email &amp; View Analysis
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#64748B;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${magicLinkUrl}" style="color:#00D9FF;font-size:12px;text-decoration:none;">${magicLinkUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 24px;" />
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. This link can only be used once.
                <br /><br />
                — The WindowMan Team
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px;border-top:1px solid rgba(255,255,255,0.04);background:#0F1419;">
              <p style="margin:0;color:#334155;font-size:11px;">
                © ${new Date().getFullYear()} WindowMan · itswindowman.com · Florida, USA
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
WindowMan — Verify Your Email

Your analysis is ready to unlock.

Click this link to verify your email and access your WindowMan analysis preview (expires in 6 hours):

${magicLinkUrl}

If you didn't request this, you can safely ignore this email. This link can only be used once.

— The WindowMan Team
  `.trim();

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Verify your email to unlock your WindowMan analysis",
    html,
    text,
  });

  if (result.error) {
    console.error("[Resend] Failed to send magic link email:", result.error);
    throw new Error(`Email delivery failed: ${result.error.message}`);
  }

  console.log(`[Resend] Magic link sent to ${to} — ID: ${result.data?.id}`);
}

/**
 * Send a "lead verified" notification to the WindowMan team.
 * Separate from Twilio SMS — this is the email channel backup.
 */
export async function sendTeamLeadNotificationEmail(opts: {
  leadEmail: string;
  leadPhone: string | null;
  source: string;
  answers?: Record<string, unknown> | null;
}): Promise<void> {
  const { leadEmail, leadPhone, source, answers } = opts;
  const teamEmail = "team@itswindowman.com";

  const answerLines = answers
    ? Object.entries(answers)
        .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
        .join("")
    : "";

  const html = `
<html><body style="font-family:sans-serif;background:#0F1419;color:#E2E8F0;padding:32px;">
  <h2 style="color:#00D9FF;">✅ New Verified WindowMan Lead</h2>
  <p><strong>Email:</strong> ${leadEmail}</p>
  <p><strong>Phone:</strong> ${leadPhone ?? "Not provided"}</p>
  <p><strong>Source:</strong> ${source}</p>
  ${answerLines ? `<p><strong>Answers:</strong></p><ul>${answerLines}</ul>` : ""}
</body></html>
  `.trim();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: teamEmail,
    subject: `✅ New Verified Lead — ${leadEmail}`,
    html,
  }).catch((err) => console.error("[Resend] Team notification failed:", err));
}
