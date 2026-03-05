/**
 * RetentionWarning.tsx
 * 90-day document retention warning block.
 * Shown on compare view and full analysis view.
 */

interface RetentionWarningProps {
  onDownloadClick?: () => void;
  onPrintClick?: () => void;
}

export function RetentionWarning({ onDownloadClick, onPrintClick }: RetentionWarningProps) {
  return (
    <div className="rounded-xl bg-amber-950/30 border border-amber-700/40 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">⚠️</span>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-black text-amber-300">
            Save this report now
          </p>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Window Man stores your structured audit data, but uploaded quote documents are automatically deleted after{" "}
            <strong className="text-amber-300">90 days</strong>. Download a copy to keep it on your device.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap pl-8">
        {onDownloadClick && (
          <button
            onClick={onDownloadClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition-colors"
          >
            ⬇ Download / Save PDF
          </button>
        )}
        {onPrintClick && (
          <button
            onClick={onPrintClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-700/60 text-amber-300 hover:text-amber-200 hover:border-amber-600 text-xs font-bold transition-colors"
          >
            🖨️ Print / Save
          </button>
        )}
      </div>
    </div>
  );
}
