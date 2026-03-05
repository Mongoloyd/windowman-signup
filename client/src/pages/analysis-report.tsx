import React from 'react';

const AnalysisReport = ({ signals, scored }: any) => {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header with Depth */}
      <div className="bg-white border-b border-slate-200 shadow-sm p-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Forensic Analysis</h1>
          <div className="flex items-center gap-3">
             <span className="text-sm font-bold text-slate-500 uppercase">Grade:</span>
             <span className="bg-rose-600 text-white font-black px-4 py-1 rounded shadow-lg transform -rotate-2 leading-none">
               {scored?.finalGrade || 'F'}
             </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        {/* Dangerous Clauses Strip */}
        <div className="bg-slate-900 rounded-xl p-4 shadow-xl overflow-x-auto">
          <p className="text-[10px] font-bold text-amber-500 uppercase mb-3 tracking-widest">Immediate Risks Detected:</p>
          <div className="flex gap-3 whitespace-nowrap">
            {["Deposit Risk", "Cancellation Trap", "Arbitration Clause", "Permit Gap"].map(tag => (
              <span key={tag} className="bg-rose-600 text-white text-xs font-black px-3 py-1.5 rounded shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Financial Exposure Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ring-4 ring-slate-100">
            <h3 className="text-sm font-black uppercase text-slate-400 mb-4">Estimated Exposure</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-600">Change-Order Risk</span>
                <span className="text-lg font-black text-rose-600">$1,000–$3,500</span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-600">Deposit Overpayment</span>
                <span className="text-lg font-black text-amber-600">$500–$2,500</span>
              </div>
            </div>
          </div>

          {/* CTA Area */}
          <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 flex flex-col justify-center text-center">
            <button className="bg-slate-900 text-white font-black py-4 rounded-xl shadow-2xl hover:scale-105 transition-transform">
               Beat-Your-Quote Check (Free)
            </button>
            <p className="mt-3 text-[11px] font-bold text-amber-800 leading-tight">
              Most homeowners save $1,200–$4,800 by fixing scope + payment terms before signing.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalysisReport;
