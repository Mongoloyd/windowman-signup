import { useInView } from "@/hooks/useInView";
import { useState, useRef, useEffect } from "react";
import { UserPlus, CheckCircle2, Home, Clock, Grid3X3, FileQuestion, Phone, Loader2, CheckCircle, ArrowLeft, RefreshCw, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const questions = [
  { icon: Home, key: "homeowner", question: "Are you the homeowner?", options: ["Yes", "No"] },
  { icon: Clock, key: "timeline", question: "What's your timeline?", options: ["Now", "Within a month", "Just researching"] },
  { icon: Grid3X3, key: "windowCount", question: "How many windows?", options: ["1–5", "6–10", "11+"] },
  { icon: FileQuestion, key: "hasEstimate", question: "Do you have an estimate?", options: ["Yes", "No"] },
];

type FlowStep = "form" | "otp" | "success";

function OTPInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) refs.current[index + 1]?.focus();
    const code = newDigits.join("");
    if (code.length === 6) onComplete(code);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      onComplete(pasted);
    }
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-xl font-bold font-mono rounded-lg border-2 text-slate-900 focus:outline-none transition-all duration-200"
          style={{
            background: digit ? "rgba(8,145,178,0.05)" : "white",
            borderColor: digit ? "#0891B2" : "#CBD5E1",
            boxShadow: digit ? "0 0 12px rgba(8,145,178,0.15)" : "none",
          }}
        />
      ))}
    </div>
  );
}

export function QualificationCard() {
  const { ref, isInView } = useInView(0.15);
  const [step, setStep] = useState<FlowStep>("form");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [e164Phone, setE164Phone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const lookupMutation = trpc.twilio.lookupAndCreateLead.useMutation({
    onSuccess: (data) => {
      setLeadId(data.leadId);
      setE164Phone(data.phone);
      sendOTPMutation.mutate({ phone: data.phone });
    },
    onError: (err) => {
      toast.error(err.message || "Unable to verify phone number. Please try again.");
    },
  });

  const sendOTPMutation = trpc.twilio.sendOTP.useMutation({
    onSuccess: () => {
      setStep("otp");
      setResendCooldown(30);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send code. Please try again.");
    },
  });

  const verifyOTPMutation = trpc.twilio.verifyOTP.useMutation({
    onSuccess: () => {
      setStep("success");
    },
    onError: (err) => {
      toast.error(err.message || "Incorrect code. Please try again.");
    },
  });

  const handleSelect = (key: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [key]: option }));
  };

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
  };

  const isFormComplete =
    Object.keys(answers).length === questions.length &&
    name.trim().length > 0 &&
    phone.trim().replace(/\D/g, "").length >= 10;

  const handleSubmit = () => {
    if (!isFormComplete) return;
    lookupMutation.mutate({
      name: name.trim(),
      phone: normalizePhone(phone),
      source: "flow_b",
      answers,
      honeypot,
    });
  };

  const handleOTPComplete = (code: string) => {
    if (!leadId || !e164Phone) return;
    verifyOTPMutation.mutate({
      leadId,
      phone: e164Phone,
      code,
      name: name.trim(),
      answers,
      source: "flow_b",
    });
  };

  const handleResend = () => {
    if (resendCooldown > 0 || !e164Phone) return;
    sendOTPMutation.mutate({ phone: e164Phone });
  };

  const handleEditNumber = () => {
    setStep("form");
    setLeadId(null);
    setE164Phone("");
  };

  const isLoading = lookupMutation.isPending || sendOTPMutation.isPending;

  return (
    <section ref={ref} id="qualification-section" className="relative py-24 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(8,145,178,0.3), transparent)" }} />

      <div className="relative z-10 container max-w-2xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <UserPlus className="w-4 h-4 text-cyan-700" />
          <span className="font-mono text-xs text-cyan-700 font-bold uppercase tracking-widest">Flow B — Quick Assessment</span>
        </div>

        <h2 className={`text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Tell Us About <span className="text-cyan-600">Your Project</span>
        </h2>
        <p className={`text-slate-700 font-medium text-lg mb-10 transition-all duration-700 delay-200 ${isInView ? "opacity-100" : "opacity-0"}`}>
          Quick assessment to match you with the right contractors.
        </p>

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div className="rounded-2xl p-10 text-center bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 mb-3">You're Verified!</h3>
            <p className="text-slate-700 mb-2">
              A WindowMan expert will contact you shortly at <span className="text-slate-900 font-semibold">{e164Phone}</span>.
            </p>
            <p className="text-slate-700 text-sm font-mono font-medium mt-2">
              Check your phone — we've sent you a confirmation text.
            </p>
          </div>
        )}

        {/* ── Step: OTP Input ── */}
        {step === "otp" && (
          <div className="rounded-2xl p-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-cyan-600" />
              <div>
                <h3 className="font-bold text-slate-900">Verify Your Number</h3>
                <p className="text-slate-700 text-sm">Code sent to <span className="text-slate-900 font-semibold">{e164Phone}</span></p>
              </div>
            </div>

            <p className="text-slate-700 text-sm mb-6">Enter the 6-digit code from your SMS:</p>

            <OTPInput onComplete={handleOTPComplete} />

            {verifyOTPMutation.isPending && (
              <div className="flex items-center justify-center gap-2 mt-4 text-cyan-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Verifying...</span>
              </div>
            )}

            {/* Resend + Edit Number */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || sendOTPMutation.isPending}
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-cyan-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
              <button
                onClick={handleEditNumber}
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Wrong number? Edit
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Form ── */}
        {step === "form" && (
          <div className={`rounded-2xl p-6 sm:p-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15 transition-all duration-700 delay-300 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* Honeypot field */}
            <div style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden", opacity: 0, pointerEvents: "none", tabIndex: -1 } as React.CSSProperties}>
              <label htmlFor="wm_website">Website</label>
              <input
                id="wm_website"
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block font-semibold text-slate-900 text-sm mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria G."
                  className="w-full px-4 py-3 rounded-lg bg-white border border-cyan-500/15 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-900 text-sm mb-2">
                  <Phone className="w-3.5 h-3.5 inline mr-1.5 text-cyan-600" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(561) 000-0000"
                  className="w-full px-4 py-3 rounded-lg bg-white border border-cyan-500/15 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors"
                />
              </div>
            </div>

            {/* Qualification Questions */}
            <div className="space-y-6">
              {questions.map((q) => (
                <div key={q.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <q.icon className="w-4 h-4 text-slate-700" />
                    <label className="font-semibold text-slate-900 text-sm">{q.question}</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((option) => {
                      const isSelected = answers[q.key] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => handleSelect(q.key, option)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? "bg-cyan-50 border border-cyan-400 text-cyan-700"
                              : "bg-white/60 border border-cyan-500/15 text-slate-700 hover:border-cyan-300 hover:text-slate-900"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-8 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(8,145,178,0.15), transparent)" }} />

            <button
              onClick={handleSubmit}
              disabled={!isFormComplete || isLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFormComplete
                  ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]"
                  : "bg-slate-300"
              }`}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Checking number...</>
              ) : (
                <><Shield className="w-4 h-4" />Connect Me — Send Verification Code</>
              )}
            </button>
            <p className="text-xs text-slate-700 font-mono font-medium mt-3 text-center">
              We verify your mobile number to eliminate fake leads. No spam, ever.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
