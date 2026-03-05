/**
 * NegotiationScripts.tsx
 * Renders exactly 3 action cards with:
 * - Script text (mono)
 * - Copy button → toast "Copied. Send this to {contractorLabel} to fix the gap."
 * - Jump to Evidence button → smooth scroll + highlight
 */

import { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { scrollToAnchor } from "./compareAnchors";
import { toast } from "sonner";

interface NegotiationScript {
  text: string;
  targetAnchor: string;
}

interface NegotiationScriptsProps {
  scripts: NegotiationScript[];
  loserLabel: string;
  idA: string;
  idB: string;
  onAnalyticsEvent?: (event: string, payload: Record<string, unknown>) => void;
}

export function NegotiationScripts({
  scripts,
  loserLabel,
  idA,
  idB,
  onAnalyticsEvent,
}: NegotiationScriptsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopy(script: NegotiationScript, index: number) {
    const success = await copyToClipboard(script.text);
    if (success) {
      setCopiedIndex(index);
      toast.success("Copied!", {
        description: `Send this to ${loserLabel} to fix the gap.`,
        duration: 3000,
      });
      onAnalyticsEvent?.("wm_compare_script_copied", {
        scriptIndex: index,
        targetAnchor: script.targetAnchor,
        idA,
        idB,
        loserLabel,
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }

  function handleJumpToEvidence(script: NegotiationScript, index: number) {
    scrollToAnchor(script.targetAnchor);
    onAnalyticsEvent?.("wm_compare_pillar_evidence_clicked", {
      scriptIndex: index,
      targetAnchor: script.targetAnchor,
      idA,
      idB,
    });
  }

  // Ensure exactly 3 scripts
  const displayScripts = scripts.slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-black text-slate-900">Negotiation Scripts</h3>
        <span className="text-[10px] rounded-full px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 font-black uppercase tracking-wide">
          3 Action Items
        </span>
      </div>
      <p className="text-xs text-slate-700">
        Use these exact scripts when negotiating with{" "}
        <span className="text-slate-900 font-bold">{loserLabel}</span>. Copy and send directly.
      </p>

      {displayScripts.map((script, i) => (
        <div
          key={i}
          className="rounded-xl bg-white/80 backdrop-blur-[24px] border border-cyan-500/15 shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] p-4 flex flex-col gap-3"
        >
          {/* Script number */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
              Action Item
            </span>
          </div>

          {/* Script text */}
          <p className="font-mono text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
            {script.text}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleCopy(script, i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                copiedIndex === i
                  ? "bg-emerald-600 text-white"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white"
              }`}
            >
              {copiedIndex === i ? "✓ Copied!" : "Copy Script"}
            </button>
            <button
              onClick={() => handleJumpToEvidence(script, i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-cyan-700 border border-slate-200 hover:border-cyan-300 transition-all"
            >
              Jump to Evidence ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
