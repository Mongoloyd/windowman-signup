import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { ScoredItem } from '@shared/scoredTypes';

interface EvidenceRevealProps {
  pillarKey: string;
  pillarLabel: string;
  forensicLabel: string;
  warnings: ScoredItem[];
  missingItems: ScoredItem[];
}

/**
 * Responsive component that displays evidence as:
 * - Desktop (>= 768px): Hover tooltip
 * - Mobile (< 768px): Tap-triggered bottom sheet
 *
 * The trigger is a small info icon next to the forensic label.
 * No layout shift occurs when triggered.
 */
export function EvidenceReveal({
  pillarKey,
  pillarLabel,
  forensicLabel,
  warnings,
  missingItems,
}: EvidenceRevealProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Filter items for this specific pillar
  const pillarWarnings = warnings.filter((item) => item.pillar === pillarKey);
  const pillarMissing = missingItems.filter((item) => item.pillar === pillarKey);

  // Combine and sort by severity (critical first)
  const allItems = [...pillarWarnings, ...pillarMissing].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return (
      (severityOrder[a.severity ?? 'info'] || 2) -
      (severityOrder[b.severity ?? 'info'] || 2)
    );
  });

  // Render evidence content
  const renderEvidence = () => {
    if (allItems.length === 0) {
      return (
        <div className="text-sm text-slate-700">
          🟢 Verified safe. No hidden clauses found.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {allItems.map((item, idx) => {
          const prefix =
            item.severity === 'critical'
              ? '🔴'
              : item.severity === 'warning'
                ? '🟡'
                : '🟢';
          return (
            <div key={idx} className="text-sm text-slate-700 leading-snug">
              <span className="mr-2">{prefix}</span>
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Trigger button (info icon + forensic label)
  const trigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
      onClick={() => isMobile && setIsOpen(true)}
    >
      <span>{forensicLabel}</span>
      <Info className="w-3.5 h-3.5 flex-shrink-0" />
    </button>
  );

  // Desktop: Tooltip
  if (!isMobile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-bold text-sm text-white">{pillarLabel} Evidence</p>
              <div className="text-sm text-slate-100">{renderEvidence()}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Mobile: Bottom Sheet Dialog
  return (
    <>
      {trigger}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto rounded-t-3xl rounded-b-none">
          <DialogHeader>
            <DialogTitle>{pillarLabel} Evidence</DialogTitle>
          </DialogHeader>
          <div className="mt-4">{renderEvidence()}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
