/**
 * Privacy.tsx
 * Route: /privacy
 * Includes explicit retention table: documents 90 days, structured audit data longer.
 */

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0F1419] text-[#E2E8F0]">
      <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black tracking-widest uppercase text-cyan-400">
            Window Man
          </p>
          <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
          <p className="text-sm text-slate-400">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Intro */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            Window Man ("we", "us", "our") operates itswindowman.com. This policy explains what data we collect,
            how we use it, and how long we keep it. We believe in plain language — no legalese.
          </p>
        </div>

        {/* Data Retention Table */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-black text-white">Data Retention Schedule</h2>
          <p className="text-sm text-slate-400">
            We apply different retention periods depending on data type and sensitivity.
          </p>

          <div className="rounded-xl overflow-hidden border border-slate-700">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_2fr] bg-slate-800 px-4 py-3 border-b border-slate-700">
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Data Type</span>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Retention</span>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Notes</span>
            </div>

            {/* Rows */}
            {[
              {
                type: "Uploaded quote documents (PDF, images)",
                retention: "90 days",
                notes: "Automatically deleted from our storage. Download a copy to keep it permanently.",
                highlight: true,
              },
              {
                type: "Structured audit data (scores, findings, pillar results)",
                retention: "Until deletion request",
                notes: "Retained to power your report history and future comparisons.",
                highlight: false,
              },
              {
                type: "Email address",
                retention: "Until deletion request",
                notes: "Used for magic link verification and report delivery only.",
                highlight: false,
              },
              {
                type: "Phone number (hashed)",
                retention: "Until deletion request",
                notes: "Stored as a one-way hash (SHA-256). Cannot be reversed. Used for OTP verification only.",
                highlight: false,
              },
              {
                type: "Session cookies",
                retention: "24 hours (email) / 30 days (phone-verified)",
                notes: "HttpOnly, Secure, SameSite=Lax. Revoked on logout.",
                highlight: false,
              },
              {
                type: "Analytics events (scores, risk levels, actions)",
                retention: "2 years",
                notes: "Aggregated and anonymized for product improvement. No PII in event payloads.",
                highlight: false,
              },
              {
                type: "IP addresses (rate limiting)",
                retention: "24 hours",
                notes: "Used only for rate limiting. Not stored in our database.",
                highlight: false,
              },
            ].map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[2fr_1fr_2fr] px-4 py-3 border-b border-slate-700/50 last:border-b-0 gap-4 ${
                  row.highlight ? "bg-amber-950/20" : ""
                }`}
              >
                <span className={`text-sm font-bold ${row.highlight ? "text-amber-300" : "text-white"}`}>
                  {row.type}
                  {row.highlight && (
                    <span className="ml-2 text-[9px] rounded px-1.5 py-0.5 bg-amber-600 text-white font-black uppercase tracking-wide">
                      Download Now
                    </span>
                  )}
                </span>
                <span className={`text-sm font-black tabular-nums ${row.highlight ? "text-amber-400" : "text-cyan-400"}`}>
                  {row.retention}
                </span>
                <span className="text-xs text-slate-400 leading-relaxed">{row.notes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What We Collect */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-black text-white">What We Collect</h2>
          <div className="flex flex-col gap-2 text-sm text-slate-300 leading-relaxed">
            <p>
              <strong className="text-white">Quote documents:</strong> PDFs and images you upload for analysis. These are processed by our AI engine to extract structured data, then deleted after 90 days.
            </p>
            <p>
              <strong className="text-white">Contact information:</strong> Email and phone number, collected during the verification flow. Phone numbers are hashed before storage.
            </p>
            <p>
              <strong className="text-white">Audit results:</strong> Scores, findings, risk levels, and pillar results generated from your quote. Retained indefinitely to power your report history.
            </p>
            <p>
              <strong className="text-white">Usage analytics:</strong> Anonymous events (e.g., "report viewed", "script copied") to improve the product. No PII in event payloads.
            </p>
          </div>
        </div>

        {/* What We Don't Do */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-black text-white">What We Don't Do</h2>
          <ul className="flex flex-col gap-2 text-sm text-slate-300 leading-relaxed list-none">
            {[
              "We do not sell your data to third parties.",
              "We do not store your phone number in plain text.",
              "We do not share your quote documents with contractors.",
              "We do not use your data for advertising targeting.",
              "We do not retain uploaded documents beyond 90 days.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-black mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Your Rights */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-black text-white">Your Rights</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You may request deletion of your account and all associated data at any time by emailing{" "}
            <a href="mailto:privacy@itswindowman.com" className="text-cyan-400 hover:text-cyan-300 underline">
              privacy@itswindowman.com
            </a>
            . We will process your request within 30 days.
          </p>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-black text-white">Contact</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Questions about this policy? Contact us at{" "}
            <a href="mailto:privacy@itswindowman.com" className="text-cyan-400 hover:text-cyan-300 underline">
              privacy@itswindowman.com
            </a>
            .
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 pt-6">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Window Man. All rights reserved.{" "}
            <a href="/" className="text-cyan-400 hover:text-cyan-300">
              Return to Home
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
