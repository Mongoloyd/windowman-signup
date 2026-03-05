/**
 * CompareReport.tsx
 * Route: /compare/:idA/:idB?lead=<leadId>
 *
 * Renders the full compare view with:
 * - CompareVerdictBanner (sticky)
 * - WaterfallPriceCard (side-by-side on desktop, stacked on mobile)
 * - PillarDiffGrid
 * - NegotiationScripts
 * - RetentionWarning
 * - ComparePrintView (Print/Save PDF button)
 *
 * Access: Phase 1 private only. Both analyses must belong to the same lead.
 * Both must be full_unlocked (phone OTP verified).
 *
 * Animations: ScrollReveal entrance on verdict, price cards, pillar grid,
 * negotiation scripts, and export section with staggered delays.
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { CompareVerdictBanner } from "@/components/compare/CompareVerdictBanner";
import { WaterfallPriceCard } from "@/components/compare/WaterfallPriceCard";
import { PillarDiffGrid } from "@/components/compare/PillarDiffGrid";
import { NegotiationScripts } from "@/components/compare/NegotiationScripts";
import { ComparePrintView } from "@/components/compare/ComparePrintView";
import { RetentionWarning } from "@/components/compare/RetentionWarning";
import { ScrollReveal } from "@/components/ScrollReveal";
import { fireDataLayerEvent } from "@/lib/pixels";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

export default function CompareReport() {
  const params = useParams<{ idA: string; idB: string }>();
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get("lead") ?? "";

  const idA = params.idA ?? "";
  const idB = params.idB ?? "";

  const { data, isLoading, error } = trpc.analysis.compareQuotes.useQuery(
    { idA, idB, leadId },
    {
      enabled: !!idA && !!idB && !!leadId,
      retry: false,
    }
  );

  function handleAnalyticsEvent(event: string, payload: Record<string, unknown>) {
    fireDataLayerEvent({ event, ...payload });
  }

  function handlePrint() {
    handleAnalyticsEvent("wm_compare_print_clicked", {
      idA,
      idB,
      winnerId: data?.comparison.meta.winnerId ?? "unknown",
    });
    window.print();
  }

  function handleDownload() {
    handleAnalyticsEvent("wm_compare_download_clicked", {
      idA,
      idB,
      winnerId: data?.comparison.meta.winnerId ?? "unknown",
    });
    window.print();
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-slate-700 text-sm">Running comparison engine…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) {
    const message =
      error?.message ??
      "Comparison failed. Both quotes must be fully verified (phone OTP) and belong to the same account.";

    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl bg-white/80 backdrop-blur-[24px] border border-rose-200 shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <h2 className="text-base font-black text-slate-900">Comparison Unavailable</h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const { quoteA, quoteB, comparison } = data;
  const { meta, pricing } = comparison;

  // Determine winner/loser for price cards
  const aIsWinner = meta.winnerId === idA;
  const bIsWinner = meta.winnerId === idB;
  const isTie = meta.winnerId === "tie";

  // Determine loser label for negotiation scripts
  const loserLabel =
    isTie
      ? quoteB.contractorLabel
      : aIsWinner
      ? quoteB.contractorLabel
      : quoteA.contractorLabel;

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      {/* Sticky Verdict Banner */}
      <CompareVerdictBanner
        comparison={comparison}
        labelA={quoteA.contractorLabel}
        labelB={quoteB.contractorLabel}
      />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* Back nav */}
        <ScrollReveal delay={0}>
          <button
            onClick={() => navigate(-1 as any)}
            className="no-print flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-bold transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analysis
          </button>
        </ScrollReveal>

        {/* Page Title */}
        <ScrollReveal delay={0.05}>
          <div className="flex flex-col gap-1 no-print">
            <h1 className="text-2xl font-black text-slate-900">Quote Comparison</h1>
            <p className="text-sm text-slate-700">
              {quoteA.contractorLabel} vs {quoteB.contractorLabel}
            </p>
          </div>
        </ScrollReveal>

        {/* Retention Warning */}
        <ScrollReveal delay={0.1}>
          <RetentionWarning
            onDownloadClick={handleDownload}
            onPrintClick={handlePrint}
          />
        </ScrollReveal>

        {/* Price Bridge — stacked on mobile, side-by-side on desktop */}
        <ScrollReveal delay={0.15}>
          <div>
            <h2 className="text-base font-black text-slate-900 mb-4">True Real Cost™ Breakdown</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <WaterfallPriceCard
                label={quoteA.contractorLabel}
                base={pricing.quoteA.base}
                adjusted={pricing.quoteA.adjusted}
                liabilities={pricing.quoteA.liabilities}
                isWinner={aIsWinner}
                isLoser={!aIsWinner && !isTie}
                isTie={isTie}
              />
              <WaterfallPriceCard
                label={quoteB.contractorLabel}
                base={pricing.quoteB.base}
                adjusted={pricing.quoteB.adjusted}
                liabilities={pricing.quoteB.liabilities}
                isWinner={bIsWinner}
                isLoser={!bIsWinner && !isTie}
                isTie={isTie}
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Pillar Diff Grid */}
        <ScrollReveal delay={0.2}>
          <div>
            <h2 className="text-base font-black text-slate-900 mb-4">5-Pillar Audit Comparison</h2>
            <PillarDiffGrid
              comparison={comparison}
              idA={idA}
              idB={idB}
              labelA={quoteA.contractorLabel}
              labelB={quoteB.contractorLabel}
              onAnalyticsEvent={handleAnalyticsEvent}
            />
          </div>
        </ScrollReveal>

        {/* Negotiation Scripts */}
        {comparison.negotiationScript.length > 0 && (
          <ScrollReveal delay={0.25}>
            <NegotiationScripts
              scripts={comparison.negotiationScript}
              loserLabel={loserLabel}
              idA={idA}
              idB={idB}
              onAnalyticsEvent={handleAnalyticsEvent}
            />
          </ScrollReveal>
        )}

        {/* Print / Save PDF */}
        <ScrollReveal delay={0.3}>
          <div className="flex flex-col gap-3 no-print">
            <h2 className="text-base font-black text-slate-900">Export This Report</h2>
            <ComparePrintView
              quoteA={quoteA}
              quoteB={quoteB}
              comparison={comparison}
              onAnalyticsEvent={handleAnalyticsEvent}
            />
          </div>
        </ScrollReveal>

      </div>
    </div>
  );
}
