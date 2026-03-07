import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Shield, FileText, DollarSign, AlertTriangle, Award,
  RotateCcw, Copy, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// Import the real engine
import {
  scoreFromSignals,
  generateSafePreview,
  generateForensicSummary,
  extractIdentity,
} from "../../../scanner-brain/index";
import type { ExtractionSignals } from "../../../scanner-brain/schema";

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SIGNALS — a "blank slate" valid quote
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SIGNALS: ExtractionSignals = {
  isValidQuote: true,
  validityReason: "Test scenario",
  totalPriceFound: true,
  totalPriceValue: 15000,
  openingCountEstimate: 10,
  hasComplianceKeyword: true,
  hasComplianceIdentifier: true,
  hasNOANumber: true,
  noaNumberValue: "NOA-21-1234.56",
  hasLaminatedMention: true,
  hasGlassBuildDetail: true,
  hasTemperedOnlyRisk: false,
  hasNonImpactLanguage: false,
  licenseNumberPresent: true,
  licenseNumberValue: "CGC1234567",
  hasOwnerBuilderLanguage: false,
  contractorNameExtracted: "Test Contractor LLC",
  hasPermitMention: true,
  hasDemoInstallDetail: true,
  hasSpecificMaterials: true,
  hasWallRepairMention: true,
  hasFinishDetail: true,
  hasCleanupMention: true,
  hasBrandClarity: true,
  hasDetailedScope: true,
  hasSubjectToChange: false,
  hasRepairsExcluded: false,
  hasStandardInstallation: false,
  depositPercentage: 20,
  hasFinalPaymentTrap: false,
  hasSafePaymentTerms: true,
  hasPaymentBeforeCompletion: false,
  hasContractTraps: false,
  contractTrapsList: [],
  hasManagerDiscount: false,
  hasWarrantyMention: true,
  hasLaborWarranty: true,
  warrantyDurationYears: 10,
  hasLifetimeWarranty: true,
  hasTransferableWarranty: true,
  hasPremiumIndicators: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════

const PRESETS: Record<string, { label: string; signals: Partial<ExtractionSignals> }> = {
  perfect: { label: "✅ Perfect Quote", signals: {} },
  average: {
    label: "😐 Average FL Quote",
    signals: {
      hasComplianceIdentifier: false, hasNOANumber: false, noaNumberValue: null,
      hasGlassBuildDetail: false, hasDemoInstallDetail: false, hasSpecificMaterials: false,
      hasWallRepairMention: false, hasFinishDetail: false, hasCleanupMention: false,
      hasDetailedScope: false, depositPercentage: 33,
      hasSafePaymentTerms: false, hasLaborWarranty: false,
      warrantyDurationYears: null, hasLifetimeWarranty: false, hasTransferableWarranty: false,
    },
  },
  noLicense: {
    label: "🚨 No License",
    signals: { licenseNumberPresent: false, licenseNumberValue: null },
  },
  scam: {
    label: "💀 Total Scam",
    signals: {
      licenseNumberPresent: false, licenseNumberValue: null,
      hasComplianceKeyword: false, hasComplianceIdentifier: false,
      hasNOANumber: false, hasLaminatedMention: false, hasGlassBuildDetail: false,
      hasTemperedOnlyRisk: true, hasNonImpactLanguage: true,
      hasPermitMention: false, hasDemoInstallDetail: false, hasSpecificMaterials: false,
      hasWallRepairMention: false, hasFinishDetail: false, hasCleanupMention: false,
      hasBrandClarity: false, hasDetailedScope: false,
      hasSubjectToChange: true, hasRepairsExcluded: true, hasStandardInstallation: true,
      depositPercentage: 60, hasFinalPaymentTrap: true, hasSafePaymentTerms: false,
      hasPaymentBeforeCompletion: true, hasContractTraps: true,
      contractTrapsList: ["arbitration clause", "lien waiver", "cancellation penalty"],
      hasManagerDiscount: true,
      hasWarrantyMention: false, hasLaborWarranty: false,
      warrantyDurationYears: null, hasLifetimeWarranty: false, hasTransferableWarranty: false,
    },
  },
  invalid: {
    label: "📄 Not a Quote",
    signals: { isValidQuote: false, validityReason: "This is a grocery receipt" },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-green-400";
  if (grade.startsWith("B")) return "text-blue-400";
  if (grade.startsWith("C")) return "text-yellow-400";
  if (grade.startsWith("D")) return "text-orange-400";
  return "text-red-500";
}

function riskBadge(level: string) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    acceptable: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return <Badge variant="outline" className={colors[level] || ""}>{level.toUpperCase()}</Badge>;
}

function PillarBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const pct = Math.min(score, 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
        <span className="font-mono font-bold">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, danger }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className={`text-sm ${danger ? "text-red-400" : "text-foreground"}`}>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function ScoringPlayground() {
  const [signals, setSignals] = useState<ExtractionSignals>({ ...DEFAULT_SIGNALS });
  const [openingHint, setOpeningHint] = useState<number | null>(null);

  const update = useCallback(<K extends keyof ExtractionSignals>(key: K, val: ExtractionSignals[K]) => {
    setSignals(prev => ({ ...prev, [key]: val }));
  }, []);

  const applyPreset = useCallback((key: string) => {
    const preset = PRESETS[key];
    if (preset) setSignals({ ...DEFAULT_SIGNALS, ...preset.signals });
  }, []);

  // Run the real engine
  const scored = useMemo(() => scoreFromSignals(signals, openingHint), [signals, openingHint]);
  const preview = useMemo(() => generateSafePreview(scored), [scored]);
  const forensic = useMemo(() => generateForensicSummary(signals, scored), [signals, scored]);
  const identity = useMemo(() => extractIdentity(signals), [signals]);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify({ signals, scored, preview, forensic, identity }, null, 2));
    toast.success("Full state copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🧪 Scoring Playground</h1>
            <p className="text-sm text-muted-foreground">Live rubric tuning — toggle signals and watch scores update instantly</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(PRESETS).map(([key, { label }]) => (
              <Button key={key} variant="outline" size="sm" onClick={() => applyPreset(key)}>{label}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSignals({ ...DEFAULT_SIGNALS })}>
              <RotateCcw className="h-4 w-4 mr-1" />Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={copyJson}>
              <Copy className="h-4 w-4 mr-1" />JSON
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Signal Controls */}
          <div className="lg:col-span-1 space-y-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {/* Document Validity */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Document</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <ToggleRow label="isValidQuote" checked={signals.isValidQuote} onChange={v => update("isValidQuote", v)} />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total Price ($)</Label>
                      <Input type="number" value={signals.totalPriceValue ?? ""} onChange={e => update("totalPriceValue", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Opening Count</Label>
                      <Input type="number" value={signals.openingCountEstimate ?? ""} onChange={e => update("openingCountEstimate", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Opening Hint (override)</Label>
                      <Input type="number" value={openingHint ?? ""} onChange={e => setOpeningHint(e.target.value ? Number(e.target.value) : null)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Safety Signals */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Shield className="h-4 w-4" />Safety</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <ToggleRow label="hasComplianceKeyword" checked={signals.hasComplianceKeyword} onChange={v => update("hasComplianceKeyword", v)} />
                    <ToggleRow label="hasComplianceIdentifier" checked={signals.hasComplianceIdentifier} onChange={v => update("hasComplianceIdentifier", v)} />
                    <ToggleRow label="hasNOANumber" checked={signals.hasNOANumber} onChange={v => update("hasNOANumber", v)} />
                    <ToggleRow label="hasLaminatedMention" checked={signals.hasLaminatedMention} onChange={v => update("hasLaminatedMention", v)} />
                    <ToggleRow label="hasGlassBuildDetail" checked={signals.hasGlassBuildDetail} onChange={v => update("hasGlassBuildDetail", v)} />
                    <ToggleRow label="hasTemperedOnlyRisk" checked={signals.hasTemperedOnlyRisk} onChange={v => update("hasTemperedOnlyRisk", v)} danger />
                    <ToggleRow label="hasNonImpactLanguage" checked={signals.hasNonImpactLanguage} onChange={v => update("hasNonImpactLanguage", v)} danger />
                  </CardContent>
                </Card>

                {/* Contractor Identity */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Contractor Identity</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <ToggleRow label="licenseNumberPresent" checked={signals.licenseNumberPresent} onChange={v => update("licenseNumberPresent", v)} />
                    <ToggleRow label="hasOwnerBuilderLanguage" checked={signals.hasOwnerBuilderLanguage} onChange={v => update("hasOwnerBuilderLanguage", v)} danger />
                  </CardContent>
                </Card>

                {/* Scope Signals */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><FileText className="h-4 w-4" />Scope</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <ToggleRow label="hasPermitMention" checked={signals.hasPermitMention} onChange={v => update("hasPermitMention", v)} />
                    <ToggleRow label="hasDemoInstallDetail" checked={signals.hasDemoInstallDetail} onChange={v => update("hasDemoInstallDetail", v)} />
                    <ToggleRow label="hasSpecificMaterials" checked={signals.hasSpecificMaterials} onChange={v => update("hasSpecificMaterials", v)} />
                    <ToggleRow label="hasWallRepairMention" checked={signals.hasWallRepairMention} onChange={v => update("hasWallRepairMention", v)} />
                    <ToggleRow label="hasFinishDetail" checked={signals.hasFinishDetail} onChange={v => update("hasFinishDetail", v)} />
                    <ToggleRow label="hasCleanupMention" checked={signals.hasCleanupMention} onChange={v => update("hasCleanupMention", v)} />
                    <ToggleRow label="hasBrandClarity" checked={signals.hasBrandClarity} onChange={v => update("hasBrandClarity", v)} />
                    <ToggleRow label="hasDetailedScope" checked={signals.hasDetailedScope} onChange={v => update("hasDetailedScope", v)} />
                    <ToggleRow label="hasSubjectToChange" checked={signals.hasSubjectToChange} onChange={v => update("hasSubjectToChange", v)} danger />
                    <ToggleRow label="hasRepairsExcluded" checked={signals.hasRepairsExcluded} onChange={v => update("hasRepairsExcluded", v)} danger />
                    <ToggleRow label="hasStandardInstallation" checked={signals.hasStandardInstallation} onChange={v => update("hasStandardInstallation", v)} danger />
                  </CardContent>
                </Card>

                {/* Fine Print */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Fine Print</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Deposit % (null = not stated)</Label>
                      <Input type="number" value={signals.depositPercentage ?? ""} onChange={e => update("depositPercentage", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <ToggleRow label="hasFinalPaymentTrap" checked={signals.hasFinalPaymentTrap} onChange={v => update("hasFinalPaymentTrap", v)} danger />
                    <ToggleRow label="hasSafePaymentTerms" checked={signals.hasSafePaymentTerms} onChange={v => update("hasSafePaymentTerms", v)} />
                    <ToggleRow label="hasPaymentBeforeCompletion" checked={signals.hasPaymentBeforeCompletion} onChange={v => update("hasPaymentBeforeCompletion", v)} danger />
                    <ToggleRow label="hasContractTraps" checked={signals.hasContractTraps} onChange={v => update("hasContractTraps", v)} danger />
                    <ToggleRow label="hasManagerDiscount" checked={signals.hasManagerDiscount} onChange={v => update("hasManagerDiscount", v)} danger />
                    <ToggleRow label="hasPremiumIndicators" checked={signals.hasPremiumIndicators} onChange={v => update("hasPremiumIndicators", v)} />
                  </CardContent>
                </Card>

                {/* Warranty */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Award className="h-4 w-4" />Warranty</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <ToggleRow label="hasWarrantyMention" checked={signals.hasWarrantyMention} onChange={v => update("hasWarrantyMention", v)} />
                    <ToggleRow label="hasLaborWarranty" checked={signals.hasLaborWarranty} onChange={v => update("hasLaborWarranty", v)} />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Warranty Years</Label>
                      <Input type="number" value={signals.warrantyDurationYears ?? ""} onChange={e => update("warrantyDurationYears", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <ToggleRow label="hasLifetimeWarranty" checked={signals.hasLifetimeWarranty} onChange={v => update("hasLifetimeWarranty", v)} />
                    <ToggleRow label="hasTransferableWarranty" checked={signals.hasTransferableWarranty} onChange={v => update("hasTransferableWarranty", v)} />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Live Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Grade Hero */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className={`text-6xl font-black ${gradeColor(scored.finalGrade)}`}>{scored.finalGrade}</div>
                    <div className="text-sm text-muted-foreground mt-1">Overall: {scored.overallScore}/100</div>
                  </div>
                  <div className="text-right space-y-2">
                    {riskBadge(preview.riskLevel)}
                    <div className="text-sm text-muted-foreground">{scored.pricePerOpening}/opening</div>
                    {scored.hardCap.applied && (
                      <Badge variant="destructive" className="text-xs">
                        CAPPED @ {scored.hardCap.ceiling} — {scored.hardCap.statute || "No statute"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pillar Scores */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pillar Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <PillarBar label="Safety (30%)" score={scored.safetyScore} icon={<Shield className="h-3 w-3" />} />
                <PillarBar label="Scope (25%)" score={scored.scopeScore} icon={<FileText className="h-3 w-3" />} />
                <PillarBar label="Price (20%)" score={scored.priceScore} icon={<DollarSign className="h-3 w-3" />} />
                <PillarBar label="Fine Print (15%)" score={scored.finePrintScore} icon={<AlertTriangle className="h-3 w-3" />} />
                <PillarBar label="Warranty (10%)" score={scored.warrantyScore} icon={<Award className="h-3 w-3" />} />
              </CardContent>
            </Card>

            {/* Warnings + Missing Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">⚠️ Warnings ({scored.warnings.length})</CardTitle></CardHeader>
                <CardContent>
                  {scored.warnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1">
                      {scored.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-red-300 leading-tight">• {w}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-400">📋 Missing Items ({scored.missingItems.length})</CardTitle></CardHeader>
                <CardContent>
                  {scored.missingItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1">
                      {scored.missingItems.map((m, i) => (
                        <li key={i} className="text-xs text-yellow-300 leading-tight">• {m}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{scored.summary}</p>
              </CardContent>
            </Card>

            {/* Forensic Summary (Collapsible) */}
            <Accordion type="single" collapsible defaultValue="forensic">
              <AccordionItem value="forensic">
                <AccordionTrigger className="text-sm font-semibold">Forensic Summary</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{forensic.headline}</p>
                    {forensic.statuteCitations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Statute Citations:</p>
                        {forensic.statuteCitations.map((c, i) => (
                          <p key={i} className="text-xs text-red-300">• {c}</p>
                        ))}
                      </div>
                    )}
                    {forensic.questionsToAsk.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Questions to Ask:</p>
                        {forensic.questionsToAsk.map((q, i) => (
                          <p key={i} className="text-xs text-foreground">• {q}</p>
                        ))}
                      </div>
                    )}
                    {forensic.positiveFindings.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Positive Findings:</p>
                        {forensic.positiveFindings.map((p, i) => (
                          <p key={i} className="text-xs text-green-400">✓ {p}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="identity">
                <AccordionTrigger className="text-sm font-semibold">Extracted Identity</AccordionTrigger>
                <AccordionContent>
                  <div className="text-xs space-y-1 font-mono">
                    <p>Contractor: {identity.contractorName ?? "—"}</p>
                    <p>License: {identity.licenseNumber ?? "—"}</p>
                    <p>NOA #s: {identity.noaNumbers.length > 0 ? identity.noaNumbers.join(", ") : "—"}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hardcap">
                <AccordionTrigger className="text-sm font-semibold">Hard Cap Details</AccordionTrigger>
                <AccordionContent>
                  <div className="text-xs space-y-1 font-mono">
                    <p>Applied: {scored.hardCap.applied ? "YES" : "No"}</p>
                    <p>Ceiling: {scored.hardCap.ceiling}</p>
                    <p>Reason: {scored.hardCap.reason ?? "—"}</p>
                    <p>Statute: {scored.hardCap.statute ?? "—"}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
