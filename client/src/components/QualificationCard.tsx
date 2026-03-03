import { useInView } from "@/hooks/useInView";
import { useState } from "react";
import { UserPlus, CheckCircle2, Home, Clock, Grid3X3, FileQuestion, Phone, Loader2, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const questions = [
  {
    icon: Home,
    key: "homeowner",
    question: "Are you the homeowner?",
    options: ["Yes", "No"],
  },
  {
    icon: Clock,
    key: "timeline",
    question: "What's your timeline?",
    options: ["Now", "Within a month", "Just researching"],
  },
  {
    icon: Grid3X3,
    key: "windowCount",
    question: "How many windows?",
    options: ["1–5", "6–10", "11+"],
  },
  {
    icon: FileQuestion,
    key: "hasEstimate",
    question: "Do you have an estimate?",
    options: ["Yes", "No"],
  },
];

export function QualificationCard() {
  const { ref, isInView } = useInView(0.15);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sendLeadSMS = trpc.twilio.sendLeadSMS.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const sendConfirmationSMS = trpc.twilio.sendConfirmationSMS.useMutation();

  const handleSelect = (key: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [key]: option }));
  };

  const isFormComplete =
    Object.keys(answers).length === questions.length &&
    name.trim().length > 0 &&
    phone.trim().length >= 10;

  const handleSubmit = () => {
    if (!isFormComplete) return;

    // Normalize phone number to E.164
    const normalizedPhone = phone.replace(/\D/g, "");
    const e164Phone = normalizedPhone.startsWith("1")
      ? `+${normalizedPhone}`
      : `+1${normalizedPhone}`;

    sendLeadSMS.mutate({
      name: name.trim(),
      phone: e164Phone,
      timeline: answers["timeline"],
      windowCount: answers["windowCount"],
      hasEstimate: answers["hasEstimate"] === "Yes",
      source: "flow_b",
    });

    // Send confirmation to homeowner
    sendConfirmationSMS.mutate({ phone: e164Phone, name: name.trim() });
  };

  return (
    <section ref={ref} id="qualification-section" className="relative py-24 overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,102,204,0.4), transparent)" }} />

      <div className="relative z-10 container max-w-2xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <UserPlus className="w-4 h-4 text-[#0066CC]" />
          <span className="font-[var(--font-mono)] text-xs text-[#0066CC] uppercase tracking-widest">Flow B — Quick Assessment</span>
        </div>

        <h2 className={`font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-white mb-3 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Tell Us About <span className="text-[#0066CC]">Your Project</span>
        </h2>
        <p className={`text-[#64748B] text-lg mb-10 transition-all duration-700 delay-200 ${isInView ? "opacity-100" : "opacity-0"}`}>
          Quick assessment to match you with the right contractors.
        </p>

        {/* Success State */}
        {submitted ? (
          <div className={`glass-card rounded-2xl p-10 text-center transition-all duration-700 ${isInView ? "opacity-100" : "opacity-0"}`}>
            <CheckCircle className="w-16 h-16 text-[#10B981] mx-auto mb-4" />
            <h3 className="font-[var(--font-display)] text-2xl font-bold text-white mb-3">You're on the List!</h3>
            <p className="text-[#94A3B8] mb-2">
              A WindowMan expert will contact you shortly at <span className="text-white font-semibold">{phone}</span>.
            </p>
            <p className="text-[#64748B] text-sm font-[var(--font-mono)]">
              Check your phone — we've sent you a confirmation text.
            </p>
          </div>
        ) : (
          /* Qualification Form */
          <div className={`glass-card rounded-2xl p-6 sm:p-8 transition-all duration-700 delay-300 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* Name + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block font-[var(--font-display)] font-semibold text-white text-sm mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria G."
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(0,102,204,0.2)] text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#0066CC] transition-colors"
                />
              </div>
              <div>
                <label className="block font-[var(--font-display)] font-semibold text-white text-sm mb-2">
                  <Phone className="w-3.5 h-3.5 inline mr-1.5 text-[#0066CC]" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(561) 000-0000"
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(0,102,204,0.2)] text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#0066CC] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q) => (
                <div key={q.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <q.icon className="w-4 h-4 text-[#64748B]" />
                    <label className="font-[var(--font-display)] font-semibold text-white text-sm">
                      {q.question}
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((option) => {
                      const isSelected = answers[q.key] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => handleSelect(q.key, option)}
                          className={`px-4 py-2 rounded-lg text-sm font-[var(--font-body)] font-medium transition-all duration-200 ${
                            isSelected
                              ? "bg-[rgba(0,102,204,0.2)] border border-[#0066CC] text-[#0066CC]"
                              : "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:border-[rgba(0,102,204,0.3)] hover:text-white"
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

            {/* Divider */}
            <div className="my-8 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,102,204,0.2), transparent)" }} />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!isFormComplete || sendLeadSMS.isPending}
              className={`w-full py-3.5 rounded-xl font-[var(--font-display)] font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                isFormComplete && !sendLeadSMS.isPending ? "hover:scale-[1.02]" : "opacity-50 cursor-not-allowed"
              }`}
              style={{
                background: isFormComplete ? "#0066CC" : "#243044",
                boxShadow: isFormComplete ? "0 0 20px rgba(0,102,204,0.3)" : "none",
              }}
            >
              {sendLeadSMS.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Connect Me with a WindowMan Expert"
              )}
            </button>
            <p className="text-xs text-[#475569] font-[var(--font-mono)] mt-3 text-center">
              We'll text you within minutes. No spam, ever.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
