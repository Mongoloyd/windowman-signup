import { ASSETS } from "@/lib/assets";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { Shield, FileSearch, Scale, FileText, Award, CheckCircle2, AlertTriangle, Phone, Loader2, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const pillars = [
  { icon: Shield, label: "Safety & Code Match", score: 92, status: "pass", detail: "Wind load specs verified. Miami-Dade NOA confirmed." },
  { icon: FileSearch, label: "Install & Scope Clarity", score: 78, status: "warn", detail: "Missing: Stucco repair line item. \"Subject to remeasure\" clause found." },
  { icon: Scale, label: "Price Fairness", score: 85, status: "warn", detail: "Labor rate 12% above county median. Material markup within range." },
  { icon: FileText, label: "Fine Print Transparency", score: 82, status: "warn", detail: "Permit responsibility unclear. Change order terms favor contractor." },
  { icon: Award, label: "Warranty Value", score: 88, status: "pass", detail: "Manufacturer warranty: Lifetime. Labor warranty: 5 years." },
];

function ScoreRing({ score, isInView }: { score: number; isInView: boolean }) {
  const animatedScore = useCountUp(score, 2000, isInView);
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (animatedScore / 100) * circumference;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(8,145,178,0.1)" strokeWidth="8" />
        <circle cx="70" cy="70" r="60" fill="none" stroke="#0891B2" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-[2000ms] ease-out"
          style={{ filter: "drop-shadow(0 0 8px rgba(8,145,178,0.4))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-bold text-slate-900">{animatedScore}</span>
        <span className="font-mono text-xs text-slate-700">/ 100</span>
      </div>
    </div>
  );
}

type ModalStep = "form" | "otp" | "success";

function OTPDigits({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const d = [...digits]; d[i] = v.slice(-1); setDigits(d);
    if (v && i < 5) refs.current[i + 1]?.focus();
    const code = d.join(""); if (code.length === 6) onComplete(code);
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) { setDigits(p.split("")); onComplete(p); }
  };
  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-11 h-13 text-center text-lg font-bold font-mono rounded-lg border-2 text-slate-900 focus:outline-none transition-all duration-200"
          style={{ background: d ? "rgba(8,145,178,0.05)" : "white", borderColor: d ? "#0891B2" : "#CBD5E1", boxShadow: d ? "0 0 10px rgba(8,145,178,0.15)" : "none" }}
        />
      ))}
    </div>
  );
}

function CallbackModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ModalStep>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [e164Phone, setE164Phone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
  };

  const sendOTPMutation = trpc.twilio.sendOTP.useMutation({
    onSuccess: () => { setStep("otp"); setResendCooldown(30); },
    onError: (err) => toast.error(err.message || "Failed to send code."),
  });

  const lookupMutation = trpc.twilio.lookupAndCreateLead.useMutation({
    onSuccess: (data) => {
      setLeadId(data.leadId); setE164Phone(data.phone);
      sendOTPMutation.mutate({ phone: data.phone });
    },
    onError: (err) => toast.error(err.message || "Unable to verify phone number."),
  });

  const verifyOTPMutation = trpc.twilio.verifyOTP.useMutation({
    onSuccess: () => setStep("success"),
    onError: (err) => toast.error(err.message || "Incorrect code. Please try again."),
  });

  const handleSubmit = () => {
    if (!name.trim() || phone.trim().replace(/\D/g, "").length < 10) return;
    lookupMutation.mutate({ name: name.trim(), phone: normalizePhone(phone), source: "callback" });
  };

  const handleOTPComplete = (code: string) => {
    if (!leadId || !e164Phone) return;
    verifyOTPMutation.mutate({ leadId, phone: e164Phone, code, name: name.trim(), source: "callback" });
  };

  const isLoading = lookupMutation.isPending || sendOTPMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-8 w-full max-w-md bg-white shadow-2xl border border-cyan-500/15">

        {/* Success */}
        {step === "success" && (
          <div className="text-center py-4">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Expert on the Way!</h3>
            <p className="text-slate-700 text-sm mb-6">A WindowMan expert will contact you at <span className="text-slate-900 font-semibold">{e164Phone}</span>.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 text-sm font-semibold hover:bg-cyan-100 transition-colors">Close</button>
          </div>
        )}

        {/* OTP */}
        {step === "otp" && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <Shield className="w-5 h-5 text-cyan-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Verify Your Number</h3>
                <p className="text-slate-700 text-xs">Code sent to <span className="text-slate-900 font-semibold">{e164Phone}</span></p>
              </div>
            </div>
            <p className="text-slate-700 text-sm mb-5">Enter the 6-digit code:</p>
            <OTPDigits onComplete={handleOTPComplete} />
            {verifyOTPMutation.isPending && (
              <div className="flex items-center justify-center gap-2 mt-4 text-cyan-600">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Verifying...</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-200">
              <button onClick={() => sendOTPMutation.mutate({ phone: e164Phone })} disabled={resendCooldown > 0 || sendOTPMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-cyan-600 transition-colors disabled:opacity-40">
                <RefreshCw className="w-3 h-3" />{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
              </button>
              <button onClick={() => setStep("form")} className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-3 h-3" />Wrong number? Edit
              </button>
            </div>
          </>
        )}

        {/* Form */}
        {step === "form" && (
          <>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Request a Callback</h3>
            <p className="text-slate-700 text-sm mb-6">A certified window expert will review your grade and call you within minutes.</p>
            <div className="space-y-4 mb-6">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name"
                className="w-full px-4 py-3 rounded-lg bg-white border border-cyan-500/15 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile Number (561) 000-0000"
                className="w-full px-4 py-3 rounded-lg bg-white border border-cyan-500/15 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={!name.trim() || phone.trim().replace(/\D/g, "").length < 10 || isLoading}
                className="flex-1 py-3 rounded-lg font-bold text-white transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                {isLoading ? "Checking..." : "Verify & Call Me"}
              </button>
              <button onClick={onClose} className="px-4 py-3 rounded-lg border border-cyan-500/15 text-slate-700 text-sm hover:text-slate-700 transition-colors">Cancel</button>
            </div>
            <p className="text-xs text-slate-700 text-center mt-3 font-mono font-medium">Mobile numbers only. We verify to eliminate fake leads.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function AnalysisReveal() {
  const { ref, isInView } = useInView(0.1);
  const [showCallbackModal, setShowCallbackModal] = useState(false);

  return (
    <section ref={ref} className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <img src={ASSETS.dashboardRevealBg} alt="" className="w-full h-full object-cover opacity-5" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(250,251,252,1) 0%, rgba(250,251,252,0.9) 50%, rgba(250,251,252,1) 100%)" }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Award className="w-4 h-4 text-emerald-700" />
          <span className="font-mono text-xs text-emerald-700 font-bold uppercase tracking-widest">Flow A — The Reveal</span>
        </div>

        <h2 className={`text-3xl sm:text-4xl font-extrabold text-slate-900 mb-12 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Your Quote Analysis
        </h2>

        {/* Grade Card */}
        <div className={`rounded-2xl p-8 mb-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15 transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="flex flex-col items-center">
              <ScoreRing score={87} isInView={isInView} />
              <div className="mt-4 text-center"><span className="font-mono text-xs text-slate-700 font-bold">OVERALL SCORE</span></div>
            </div>
            <div className="text-center">
              <div className="text-8xl font-bold text-slate-900 mb-2" style={{ textShadow: "0 0 30px rgba(8,145,178,0.15)" }}>B</div>
              <span className="font-mono text-sm text-cyan-600">GRADE</span>
              <p className="text-slate-700 font-medium text-sm mt-2">Above average, but room for negotiation.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-sm text-slate-800 font-medium">Passed</span>
                <span className="font-mono font-bold text-emerald-600">2 / 5</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-sm text-slate-800 font-medium">Warnings</span>
                <span className="font-mono font-bold text-amber-500">3 / 5</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-200">
                <span className="text-sm text-slate-800 font-medium">Critical</span>
                <span className="font-mono font-bold text-rose-500">0 / 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar Breakdown */}
        <div className="space-y-4 mb-10">
          {pillars.map((pillar, i) => (
            <div key={pillar.label} className={`rounded-xl p-5 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${400 + i * 150}ms` }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  {pillar.status === "pass" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <pillar.icon className="w-4 h-4 text-slate-700" />
                      <h4 className="font-bold text-slate-900 text-sm">{pillar.label}</h4>
                    </div>
                    <span className={`font-mono text-sm font-bold ${pillar.status === "pass" ? "text-emerald-500" : "text-amber-500"}`}>{pillar.score}/100</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 mb-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-[1500ms] ease-out"
                      style={{ width: isInView ? `${pillar.score}%` : "0%", background: pillar.status === "pass" ? "#10B981" : "#F59E0B", transitionDelay: `${600 + i * 150}ms` }} />
                  </div>
                  <p className="text-xs text-slate-700 font-mono font-medium">{pillar.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`text-center transition-all duration-700 delay-1000 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <button onClick={() => setShowCallbackModal(true)}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 transition-all duration-300 hover:scale-105 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]">
            <Phone className="w-5 h-5" />
            For a Better Quote, Call WindowMan
          </button>
          <p className="mt-3 text-xs text-slate-700 font-mono font-medium">Speak with a certified window expert • No obligation</p>
        </div>
      </div>

      {showCallbackModal && <CallbackModal onClose={() => setShowCallbackModal(false)} />}
    </section>
  );
}
