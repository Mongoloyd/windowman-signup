import { useInView } from "@/hooks/useInView";
import { useState } from "react";
import { UserPlus, CheckCircle2, Home, Clock, Grid3X3, FileQuestion } from "lucide-react";

const questions = [
  {
    icon: Home,
    question: "Are you the homeowner?",
    options: ["Yes", "No"],
  },
  {
    icon: Clock,
    question: "What's your timeline?",
    options: ["Now", "Within a month", "Just researching"],
  },
  {
    icon: Grid3X3,
    question: "How many windows?",
    options: ["1–5", "6–10", "11+"],
  },
  {
    icon: FileQuestion,
    question: "Do you have an estimate?",
    options: ["Yes", "No"],
  },
];

export function QualificationCard() {
  const { ref, isInView } = useInView(0.15);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleSelect = (questionIndex: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: option }));
  };

  const isComplete = Object.keys(answers).length === questions.length;

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

        {/* Qualification Form */}
        <div className={`glass-card rounded-2xl p-6 sm:p-8 transition-all duration-700 delay-300 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="space-y-6">
            {questions.map((q, qi) => (
              <div key={q.question} className="space-y-3">
                <div className="flex items-center gap-2">
                  <q.icon className="w-4 h-4 text-[#64748B]" />
                  <label className="font-[var(--font-display)] font-semibold text-white text-sm">
                    {q.question}
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((option) => {
                    const isSelected = answers[qi] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleSelect(qi, option)}
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
            className={`w-full py-3.5 rounded-xl font-[var(--font-display)] font-bold text-white transition-all duration-300 ${
              isComplete ? "hover:scale-[1.02]" : "opacity-50 cursor-not-allowed"
            }`}
            style={{
              background: isComplete ? "#0066CC" : "#243044",
              boxShadow: isComplete ? "0 0 20px rgba(0,102,204,0.3)" : "none",
            }}
            disabled={!isComplete}
          >
            Complete Profile
          </button>
          <p className="text-xs text-[#475569] font-[var(--font-mono)] mt-3 text-center">
            We'll match you with vetted contractors in your area
          </p>
        </div>
      </div>
    </section>
  );
}
