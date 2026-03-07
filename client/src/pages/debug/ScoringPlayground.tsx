import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  FileText,
  DollarSign,
  AlertTriangle,
  Award,
  RotateCcw,
  Copy,
  Play,
  Loader2,
  Info,
  Lock,
  User,
  Building2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL ExtractionSignals TYPE (mirrors server/scanner-brain/schema.ts)
// ═══════════════════════════════════════════════════════════════════════════

type ExtractionSignals = {
  contractor_name: string | null;
  contractor_license: string | null;
  contractor_address: string | null;
  contractor_phone: string | null;
  contractor_email: string | null;
  contractor_website: string | null;
  homeowner_name: string | null;
  homeowner_address: string | null;
  homeowner_city: string | null;
  homeowner_zip: string | null;
  doc_date: string | null;
  opening_count: number | null;
  product_types: string[] | null;
  product_series: string[] | null;
  noa_numbers: string[] | null;
  fl_approval_numbers: string[] | null;
  design_pressure_listed: boolean | null;
  design_pressure_value: string | null;
  missile_impact_rated: boolean | null;
  energy_star_listed: boolean | null;
  glass_type: string | null;
  frame_material: string | null;
  color_finish: string | null;
  screen_included: boolean | null;
  custom_sizes_noted: boolean | null;
  installation_included: boolean | null;
  removal_of_old_windows: boolean | null;
  stucco_repair_included: boolean | null;
  trim_wrap_included: boolean | null;
  permit_included: boolean | null;
  inspection_included: boolean | null;
  debris_cleanup_included: boolean | null;
  installation_method: string | null;
  total_price: number | null;
  price_per_opening: number | null;
  deposit_amount: number | null;
  deposit_percentage: number | null;
  financing_offered: boolean | null;
  financing_terms: string | null;
  discount_listed: boolean | null;
  discount_amount: number | null;
  discount_description: string | null;
  tax_included: boolean | null;
  payment_schedule_described: boolean | null;
  payment_schedule_details: string | null;
  cancellation_clause: boolean | null;
  cancellation_window_days: number | null;
  change_order_clause: boolean | null;
  lien_waiver_mentioned: boolean | null;
  arbitration_clause: boolean | null;
  escalation_clause: boolean | null;
  completion_timeline_days: number | null;
  completion_timeline_stated: boolean | null;
  penalty_for_delay: boolean | null;
  insurance_proof_mentioned: boolean | null;
  license_number_on_contract: boolean | null;
  manufacturer_warranty_years: number | null;
  labor_warranty_years: number | null;
  warranty_transferable: boolean | null;
  warranty_exclusions_noted: boolean | null;
  lifetime_warranty_claimed: boolean | null;
  pressure_tactics_detected: boolean | null;
  today_only_pricing: boolean | null;
  verbal_promises_noted: boolean | null;
  missing_permit_reference: boolean | null;
  missing_noa: boolean | null;
  unusually_low_price: boolean | null;
  unusually_high_price: boolean | null;
  deposit_exceeds_statutory_limit: boolean | null;
  document_is_quote: boolean;
  document_is_contract: boolean;
  document_is_window_door_related: boolean;
  page_count: number | null;
  confidence_score: number;
  extraction_notes: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SIGNALS — a "blank slate" valid quote
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SIGNALS: ExtractionSignals = {
  // Identity
  contractor_name: "Test Contractor LLC",
  contractor_license: "CGC1234567",
  contractor_address: "123 Main St, Miami FL 33101",
  contractor_phone: "(305) 555-0100",
  contractor_email: "info@testcontractor.com",
  contractor_website: "https://testcontractor.com",
  homeowner_name: "Jane Homeowner",
  homeowner_address: "456 Oak Ave",
  homeowner_city: "Fort Lauderdale",
  homeowner_zip: "33301",
  doc_date: "2026-01-15",
  // Scope
  opening_count: 10,
  product_types: ["Single Hung", "Sliding Glass Door"],
  product_series: ["PGT WinGuard"],
  noa_numbers: ["NOA-21-1234.56"],
  fl_approval_numbers: ["FL-12345"],
  design_pressure_listed: true,
  design_pressure_value: "+50/-60 PSF",
  missile_impact_rated: true,
  energy_star_listed: true,
  glass_type: "Laminated Impact",
  frame_material: "Vinyl",
  color_finish: "White",
  screen_included: true,
  custom_sizes_noted: true,
  // Installation
  installation_included: true,
  removal_of_old_windows: true,
  stucco_repair_included: true,
  trim_wrap_included: true,
  permit_included: true,
  inspection_included: true,
  debris_cleanup_included: true,
  installation_method: "Full-frame replacement",
  // Pricing
  total_price: 15000,
  price_per_opening: 1500,
  deposit_amount: 3000,
  deposit_percentage: 20,
  financing_offered: false,
  financing_terms: null,
  discount_listed: false,
  discount_amount: null,
  discount_description: null,
  tax_included: true,
  payment_schedule_described: true,
  payment_schedule_details: "20% deposit, 30% at start, 50% on completion",
  // Fine Print
  cancellation_clause: true,
  cancellation_window_days: 3,
  change_order_clause: true,
  lien_waiver_mentioned: true,
  arbitration_clause: false,
  escalation_clause: false,
  completion_timeline_days: 60,
  completion_timeline_stated: true,
  penalty_for_delay: false,
  insurance_proof_mentioned: true,
  license_number_on_contract: true,
  // Warranty
  manufacturer_warranty_years: 25,
  labor_warranty_years: 10,
  warranty_transferable: true,
  warranty_exclusions_noted: false,
  lifetime_warranty_claimed: true,
  // Red Flags
  pressure_tactics_detected: false,
  today_only_pricing: false,
  verbal_promises_noted: false,
  missing_permit_reference: false,
  missing_noa: false,
  unusually_low_price: false,
  unusually_high_price: false,
  deposit_exceeds_statutory_limit: false,
  // Document Quality
  document_is_quote: true,
  document_is_contract: false,
  document_is_window_door_related: true,
  page_count: 3,
  confidence_score: 0.95,
  extraction_notes: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════

const PRESETS: Record<
  string,
  { label: string; emoji: string; signals: Partial<ExtractionSignals> }
> = {
  perfect: { label: "Perfect Quote", emoji: "✅", signals: {} },
  average: {
    label: "Average FL Quote",
    emoji: "😐",
    signals: {
      noa_numbers: null,
      fl_approval_numbers: null,
      design_pressure_listed: false,
      missile_impact_rated: null,
      installation_method: null,
      installation_included: true,
      removal_of_old_windows: true,
      stucco_repair_included: false,
      trim_wrap_included: false,
      permit_included: false,
      inspection_included: false,
      debris_cleanup_included: false,
      deposit_percentage: 33,
      payment_schedule_described: false,
      tax_included: false,
      cancellation_clause: false,
      change_order_clause: false,
      lien_waiver_mentioned: false,
      insurance_proof_mentioned: false,
      license_number_on_contract: false,
      manufacturer_warranty_years: null,
      labor_warranty_years: null,
      warranty_transferable: false,
      lifetime_warranty_claimed: false,
    },
  },
  noLicense: {
    label: "No License",
    emoji: "🚨",
    signals: {
      contractor_license: null,
      license_number_on_contract: false,
      insurance_proof_mentioned: false,
    },
  },
  scam: {
    label: "Total Scam",
    emoji: "💀",
    signals: {
      contractor_license: null,
      license_number_on_contract: false,
      noa_numbers: null,
      fl_approval_numbers: null,
      design_pressure_listed: false,
      missile_impact_rated: false,
      missing_noa: true,
      installation_method: null,
      permit_included: false,
      inspection_included: false,
      debris_cleanup_included: false,
      stucco_repair_included: false,
      trim_wrap_included: false,
      removal_of_old_windows: false,
      missing_permit_reference: true,
      deposit_percentage: 60,
      deposit_exceeds_statutory_limit: true,
      payment_schedule_described: false,
      tax_included: false,
      today_only_pricing: true,
      pressure_tactics_detected: true,
      verbal_promises_noted: true,
      cancellation_clause: false,
      change_order_clause: false,
      lien_waiver_mentioned: false,
      arbitration_clause: true,
      escalation_clause: true,
      insurance_proof_mentioned: false,
      manufacturer_warranty_years: null,
      labor_warranty_years: null,
      warranty_transferable: false,
      lifetime_warranty_claimed: false,
      unusually_high_price: true,
    },
  },
  invalid: {
    label: "Not a Quote",
    emoji: "📄",
    signals: {
      document_is_quote: false,
      document_is_window_door_related: false,
      confidence_score: 0.2,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// RESULT TYPES (mirrors server output)
// ═══════════════════════════════════════════════════════════════════════════

type PillarKey = "safety" | "scope" | "price" | "fine_print" | "warranty";
type PillarStatus = "ok" | "warn" | "flag";

type ScoredResult = {
  overallScore: number;
  finalGrade: string;
  safetyScore: number;
  scopeScore: number;
  priceScore: number;
  finePrintScore: number;
  warrantyScore: number;
  pillarStatuses: Record<PillarKey, PillarStatus>;
  warnings: string[];
  missingItems: string[];
  hardCap: {
    applied: boolean;
    reason: string | null;
    statute: string | null;
    ceiling: number | null;
  };
};

type SafePreview = {
  overallScore: number;
  finalGrade: string;
  riskLevel: "Critical" | "Moderate" | "Acceptable";
  warningBucket: "0" | "1-2" | "3+" | "5+";
  findings: Array<{
    pillarKey: PillarKey;
    pillarLabel: string;
    severity: "warn" | "flag";
    label: string;
    tooltip: string;
  }>;
};

type ForensicSummary = {
  headline: string;
  risk_level: "critical" | "high" | "moderate" | "acceptable";
  statute_citations: string[];
  questions_to_ask: string[];
  positive_findings: string[];
  hard_cap_applied: boolean;
  hard_cap_reason: string | null;
  hard_cap_statute: string | null;
};

type ExtractedIdentity = {
  contractor_name: string | null;
  contractor_license: string | null;
  contractor_phone: string | null;
  contractor_email: string | null;
  contractor_website: string | null;
  contractor_address: string | null;
  homeowner_name: string | null;
  homeowner_city: string | null;
  homeowner_zip: string | null;
  noa_numbers: string[];
  fl_approval_numbers: string[];
};

type ScoringResult = {
  scored: ScoredResult;
  preview: SafePreview;
  forensic: ForensicSummary;
  identity: ExtractedIdentity;
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-600";
  if (grade.startsWith("B")) return "text-cyan-600";
  if (grade.startsWith("C")) return "text-amber-600";
  if (grade.startsWith("D")) return "text-orange-600";
  return "text-red-600";
}

function riskBadge(level: string) {
  const colors: Record<string, string> = {
    critical: "bg-red-50 text-red-800 border-red-200",
    high: "bg-orange-50 text-orange-800 border-orange-200",
    moderate: "bg-amber-50 text-amber-800 border-amber-200",
    acceptable: "bg-emerald-50 text-emerald-800 border-emerald-200",
    Critical: "bg-red-50 text-red-800 border-red-200",
    Moderate: "bg-amber-50 text-amber-800 border-amber-200",
    Acceptable: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };
  return (
    <Badge variant="outline" className={colors[level] || ""}>
      {level.toUpperCase()}
    </Badge>
  );
}

function statusBadge(status: PillarStatus) {
  const colors: Record<PillarStatus, string> = {
    ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    flag: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[status]}`}>
      {status.toUpperCase()}
    </Badge>
  );
}

function PillarBar({
  label,
  score,
  status,
  icon,
}: {
  label: string;
  score: number;
  status: PillarStatus;
  icon: React.ReactNode;
}) {
  const pct = Math.min(score, 100);
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
          {icon}
          {label}
        </span>
        <div className="flex items-center gap-2">
          {statusBadge(status)}
          <span className="font-mono font-bold text-slate-900 w-8 text-right">
            {score}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  danger,
  tooltip,
}: {
  label: string;
  checked: boolean | null;
  onChange: (v: boolean) => void;
  danger?: boolean;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1">
        <Label
          className={`text-sm ${danger ? "text-red-600 font-medium" : "text-slate-700"}`}
        >
          {label}
        </Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-slate-400" />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Switch checked={checked === true} onCheckedChange={onChange} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
        placeholder={placeholder || "null"}
        className="h-8 text-sm"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ScoringPlayground() {
  const { user, loading: authLoading } = useAuth();
  const [signals, setSignals] = useState<ExtractionSignals>({
    ...DEFAULT_SIGNALS,
  });
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [autoRun, setAutoRun] = useState(true);

  const runScoring = trpc.debug.runScoring.useMutation({
    onSuccess: (data) => {
      setResult(data as ScoringResult);
    },
    onError: (err) => {
      toast.error(`Scoring failed: ${err.message}`);
    },
  });

  const update = useCallback(
    <K extends keyof ExtractionSignals>(key: K, val: ExtractionSignals[K]) => {
      setSignals((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  const applyPreset = useCallback((key: string) => {
    const preset = PRESETS[key];
    if (preset) setSignals({ ...DEFAULT_SIGNALS, ...preset.signals });
  }, []);

  // Auto-run scoring when signals change (debounced)
  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(() => {
      runScoring.mutate({ signals });
    }, 300);
    return () => clearTimeout(timer);
  }, [signals, autoRun]);

  const runManually = useCallback(() => {
    runScoring.mutate({ signals });
  }, [signals, runScoring]);

  const copyJson = useCallback(() => {
    navigator.clipboard.writeText(
      JSON.stringify({ signals, result }, null, 2)
    );
    toast.success("Full state copied to clipboard");
  }, [signals, result]);

  // Run on mount
  useEffect(() => {
    runScoring.mutate({ signals: DEFAULT_SIGNALS });
  }, []);

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Lock className="h-12 w-12 text-slate-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">
              Admin Access Required
            </h2>
            <p className="text-slate-600">
              The Scoring Playground is restricted to admin users. Please log in
              with an admin account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scored = result?.scored;
  const preview = result?.preview;
  const forensic = result?.forensic;
  const identity = result?.identity;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              Master Control Room
            </h1>
            <p className="text-sm text-muted-foreground">
              Live rubric tuning — toggle signals and watch scores update
              instantly via the scoring engine
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {Object.entries(PRESETS).map(([key, { label, emoji }]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(key)}
                className="text-xs"
              >
                {emoji} {label}
              </Button>
            ))}
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSignals({ ...DEFAULT_SIGNALS });
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={copyJson}>
              <Copy className="h-4 w-4 mr-1" />
              JSON
            </Button>
            {!autoRun && (
              <Button
                variant="default"
                size="sm"
                onClick={runManually}
                disabled={runScoring.isPending}
              >
                {runScoring.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Run
              </Button>
            )}
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Auto</Label>
              <Switch checked={autoRun} onCheckedChange={setAutoRun} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Signal Controls */}
          <div className="lg:col-span-1 space-y-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                <Tabs defaultValue="safety" className="w-full">
                  <TabsList className="w-full grid grid-cols-5">
                    <TabsTrigger value="safety" className="text-xs">
                      <Shield className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="scope" className="text-xs">
                      <FileText className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="price" className="text-xs">
                      <DollarSign className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="fine_print" className="text-xs">
                      <AlertTriangle className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="warranty" className="text-xs">
                      <Award className="h-3 w-3" />
                    </TabsTrigger>
                  </TabsList>

                  {/* Safety Tab */}
                  <TabsContent value="safety" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <Shield className="h-4 w-4 text-primary" />
                          Safety & Compliance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <ToggleRow
                          label="design_pressure_listed"
                          checked={signals.design_pressure_listed}
                          onChange={(v) =>
                            update("design_pressure_listed", v)
                          }
                          tooltip="Design pressure rating on document"
                        />
                        <ToggleRow
                          label="missile_impact_rated"
                          checked={signals.missile_impact_rated}
                          onChange={(v) =>
                            update("missile_impact_rated", v)
                          }
                          tooltip="Large missile impact rated"
                        />
                        <ToggleRow
                          label="missing_noa"
                          checked={signals.missing_noa}
                          onChange={(v) => update("missing_noa", v)}
                          danger
                          tooltip="Impact claimed but no NOA"
                        />
                        <ToggleRow
                          label="missing_permit_reference"
                          checked={signals.missing_permit_reference}
                          onChange={(v) =>
                            update("missing_permit_reference", v)
                          }
                          danger
                        />
                        <Separator className="my-2" />
                        <Label className="text-xs text-slate-500 font-medium">
                          Arrays (comma-separated)
                        </Label>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">
                            NOA Numbers
                          </Label>
                          <Input
                            value={signals.noa_numbers?.join(", ") ?? ""}
                            onChange={(e) =>
                              update(
                                "noa_numbers",
                                e.target.value
                                  ? e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                  : null
                              )
                            }
                            className="h-8 text-sm"
                            placeholder="NOA-21-1234.56"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">
                            FL Approval Numbers
                          </Label>
                          <Input
                            value={
                              signals.fl_approval_numbers?.join(", ") ?? ""
                            }
                            onChange={(e) =>
                              update(
                                "fl_approval_numbers",
                                e.target.value
                                  ? e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                  : null
                              )
                            }
                            className="h-8 text-sm"
                            placeholder="FL-12345"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">
                            Installation Method
                          </Label>
                          <Input
                            value={signals.installation_method ?? ""}
                            onChange={(e) =>
                              update(
                                "installation_method",
                                e.target.value || null
                              )
                            }
                            className="h-8 text-sm"
                            placeholder="Full-frame replacement"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Scope Tab */}
                  <TabsContent value="scope" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-primary" />
                          Scope & Installation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <NumberField
                          label="Opening Count"
                          value={signals.opening_count}
                          onChange={(v) => update("opening_count", v)}
                        />
                        <ToggleRow
                          label="installation_included"
                          checked={signals.installation_included}
                          onChange={(v) =>
                            update("installation_included", v)
                          }
                        />
                        <ToggleRow
                          label="removal_of_old_windows"
                          checked={signals.removal_of_old_windows}
                          onChange={(v) =>
                            update("removal_of_old_windows", v)
                          }
                        />
                        <ToggleRow
                          label="permit_included"
                          checked={signals.permit_included}
                          onChange={(v) => update("permit_included", v)}
                        />
                        <ToggleRow
                          label="inspection_included"
                          checked={signals.inspection_included}
                          onChange={(v) =>
                            update("inspection_included", v)
                          }
                        />
                        <ToggleRow
                          label="debris_cleanup_included"
                          checked={signals.debris_cleanup_included}
                          onChange={(v) =>
                            update("debris_cleanup_included", v)
                          }
                        />
                        <ToggleRow
                          label="stucco_repair_included"
                          checked={signals.stucco_repair_included}
                          onChange={(v) =>
                            update("stucco_repair_included", v)
                          }
                        />
                        <ToggleRow
                          label="trim_wrap_included"
                          checked={signals.trim_wrap_included}
                          onChange={(v) =>
                            update("trim_wrap_included", v)
                          }
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Price Tab */}
                  <TabsContent value="price" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Pricing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <NumberField
                          label="Total Price ($)"
                          value={signals.total_price}
                          onChange={(v) => update("total_price", v)}
                        />
                        <NumberField
                          label="Price Per Opening ($)"
                          value={signals.price_per_opening}
                          onChange={(v) => update("price_per_opening", v)}
                        />
                        <NumberField
                          label="Deposit %"
                          value={signals.deposit_percentage}
                          onChange={(v) => update("deposit_percentage", v)}
                        />
                        <NumberField
                          label="Deposit Amount ($)"
                          value={signals.deposit_amount}
                          onChange={(v) => update("deposit_amount", v)}
                        />
                        <ToggleRow
                          label="deposit_exceeds_statutory_limit"
                          checked={signals.deposit_exceeds_statutory_limit}
                          onChange={(v) =>
                            update("deposit_exceeds_statutory_limit", v)
                          }
                          danger
                          tooltip="FL §489.126 — max 10% or $1000"
                        />
                        <ToggleRow
                          label="unusually_high_price"
                          checked={signals.unusually_high_price}
                          onChange={(v) =>
                            update("unusually_high_price", v)
                          }
                          danger
                        />
                        <ToggleRow
                          label="unusually_low_price"
                          checked={signals.unusually_low_price}
                          onChange={(v) =>
                            update("unusually_low_price", v)
                          }
                          danger
                        />
                        <ToggleRow
                          label="payment_schedule_described"
                          checked={signals.payment_schedule_described}
                          onChange={(v) =>
                            update("payment_schedule_described", v)
                          }
                        />
                        <ToggleRow
                          label="tax_included"
                          checked={signals.tax_included}
                          onChange={(v) => update("tax_included", v)}
                        />
                        <ToggleRow
                          label="today_only_pricing"
                          checked={signals.today_only_pricing}
                          onChange={(v) =>
                            update("today_only_pricing", v)
                          }
                          danger
                          tooltip="Pressure tactic"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Fine Print Tab */}
                  <TabsContent value="fine_print" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-primary" />
                          Fine Print & Contract
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ToggleRow
                          label="cancellation_clause"
                          checked={signals.cancellation_clause}
                          onChange={(v) =>
                            update("cancellation_clause", v)
                          }
                        />
                        <NumberField
                          label="Cancellation Window (days)"
                          value={signals.cancellation_window_days}
                          onChange={(v) =>
                            update("cancellation_window_days", v)
                          }
                        />
                        <ToggleRow
                          label="change_order_clause"
                          checked={signals.change_order_clause}
                          onChange={(v) =>
                            update("change_order_clause", v)
                          }
                        />
                        <ToggleRow
                          label="lien_waiver_mentioned"
                          checked={signals.lien_waiver_mentioned}
                          onChange={(v) =>
                            update("lien_waiver_mentioned", v)
                          }
                        />
                        <ToggleRow
                          label="arbitration_clause"
                          checked={signals.arbitration_clause}
                          onChange={(v) =>
                            update("arbitration_clause", v)
                          }
                          danger
                          tooltip="Mandatory arbitration"
                        />
                        <ToggleRow
                          label="escalation_clause"
                          checked={signals.escalation_clause}
                          onChange={(v) =>
                            update("escalation_clause", v)
                          }
                          danger
                          tooltip="Price escalation"
                        />
                        <ToggleRow
                          label="completion_timeline_stated"
                          checked={signals.completion_timeline_stated}
                          onChange={(v) =>
                            update("completion_timeline_stated", v)
                          }
                        />
                        <ToggleRow
                          label="insurance_proof_mentioned"
                          checked={signals.insurance_proof_mentioned}
                          onChange={(v) =>
                            update("insurance_proof_mentioned", v)
                          }
                        />
                        <ToggleRow
                          label="license_number_on_contract"
                          checked={signals.license_number_on_contract}
                          onChange={(v) =>
                            update("license_number_on_contract", v)
                          }
                        />
                        <ToggleRow
                          label="pressure_tactics_detected"
                          checked={signals.pressure_tactics_detected}
                          onChange={(v) =>
                            update("pressure_tactics_detected", v)
                          }
                          danger
                        />
                        <ToggleRow
                          label="verbal_promises_noted"
                          checked={signals.verbal_promises_noted}
                          onChange={(v) =>
                            update("verbal_promises_noted", v)
                          }
                          danger
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Warranty Tab */}
                  <TabsContent value="warranty" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-primary" />
                          Warranty
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <NumberField
                          label="Manufacturer Warranty (years)"
                          value={signals.manufacturer_warranty_years}
                          onChange={(v) =>
                            update("manufacturer_warranty_years", v)
                          }
                        />
                        <NumberField
                          label="Labor Warranty (years)"
                          value={signals.labor_warranty_years}
                          onChange={(v) =>
                            update("labor_warranty_years", v)
                          }
                        />
                        <ToggleRow
                          label="warranty_transferable"
                          checked={signals.warranty_transferable}
                          onChange={(v) =>
                            update("warranty_transferable", v)
                          }
                        />
                        <ToggleRow
                          label="warranty_exclusions_noted"
                          checked={signals.warranty_exclusions_noted}
                          onChange={(v) =>
                            update("warranty_exclusions_noted", v)
                          }
                          danger
                        />
                        <ToggleRow
                          label="lifetime_warranty_claimed"
                          checked={signals.lifetime_warranty_claimed}
                          onChange={(v) =>
                            update("lifetime_warranty_claimed", v)
                          }
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Document Quality — always visible */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-slate-500" />
                      Document Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ToggleRow
                      label="document_is_quote"
                      checked={signals.document_is_quote}
                      onChange={(v) => update("document_is_quote", v)}
                    />
                    <ToggleRow
                      label="document_is_contract"
                      checked={signals.document_is_contract}
                      onChange={(v) => update("document_is_contract", v)}
                    />
                    <ToggleRow
                      label="document_is_window_door_related"
                      checked={signals.document_is_window_door_related}
                      onChange={(v) =>
                        update("document_is_window_door_related", v)
                      }
                    />
                    <NumberField
                      label="Confidence Score (0-1)"
                      value={signals.confidence_score}
                      onChange={(v) =>
                        update("confidence_score", v ?? 0)
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Live Results */}
          <div className="lg:col-span-2 space-y-4">
            {runScoring.isPending && !result && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {scored && preview && forensic && identity && (
              <>
                {/* Grade Hero */}
                <Card className="bg-white/80 backdrop-blur-sm border-cyan-500/15">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div
                          className={`text-6xl font-black font-display ${gradeColor(scored.finalGrade)}`}
                        >
                          {scored.finalGrade}
                        </div>
                        <div className="text-sm text-slate-500 mt-1 font-mono">
                          Overall: {scored.overallScore}/100
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        {riskBadge(preview.riskLevel)}
                        <div className="text-xs text-slate-500">
                          Warning Bucket: {preview.warningBucket}
                        </div>
                        {scored.hardCap.applied && (
                          <Badge
                            variant="destructive"
                            className="text-xs"
                          >
                            CAPPED @ {scored.hardCap.ceiling} —{" "}
                            {scored.hardCap.statute || "No statute"}
                          </Badge>
                        )}
                        {runScoring.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary inline-block ml-2" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pillar Scores */}
                <Card className="bg-white/80 backdrop-blur-sm border-cyan-500/15">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-900">
                      Pillar Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <PillarBar
                      label="Safety (25%)"
                      score={scored.safetyScore}
                      status={scored.pillarStatuses.safety}
                      icon={<Shield className="h-3 w-3" />}
                    />
                    <PillarBar
                      label="Scope (20%)"
                      score={scored.scopeScore}
                      status={scored.pillarStatuses.scope}
                      icon={<FileText className="h-3 w-3" />}
                    />
                    <PillarBar
                      label="Price (25%)"
                      score={scored.priceScore}
                      status={scored.pillarStatuses.price}
                      icon={<DollarSign className="h-3 w-3" />}
                    />
                    <PillarBar
                      label="Fine Print (20%)"
                      score={scored.finePrintScore}
                      status={scored.pillarStatuses.fine_print}
                      icon={<AlertTriangle className="h-3 w-3" />}
                    />
                    <PillarBar
                      label="Warranty (10%)"
                      score={scored.warrantyScore}
                      status={scored.pillarStatuses.warranty}
                      icon={<Award className="h-3 w-3" />}
                    />
                  </CardContent>
                </Card>

                {/* SafePreview Findings */}
                {preview.findings.length > 0 && (
                  <Card className="bg-white/80 backdrop-blur-sm border-cyan-500/15">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-900">
                        SafePreview Findings (max 3, flags first)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {preview.findings.map(
                          (f: SafePreview["findings"][0], i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-2 rounded-lg bg-slate-50"
                            >
                              {statusBadge(f.severity)}
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {f.pillarLabel}: {f.label}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {f.tooltip}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings + Missing Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white/80 backdrop-blur-sm border-cyan-500/15">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-700">
                        Warnings ({scored.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {scored.warnings.length === 0 ? (
                        <p className="text-sm text-slate-500">None</p>
                      ) : (
                        <ul className="space-y-1">
                          {scored.warnings.map(
                            (w: string, i: number) => (
                              <li
                                key={i}
                                className="text-xs text-red-700 leading-tight"
                              >
                                • {w}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-white/80 backdrop-blur-sm border-cyan-500/15">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-amber-700">
                        Missing Items ({scored.missingItems.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {scored.missingItems.length === 0 ? (
                        <p className="text-sm text-slate-500">None</p>
                      ) : (
                        <ul className="space-y-1">
                          {scored.missingItems.map(
                            (m: string, i: number) => (
                              <li
                                key={i}
                                className="text-xs text-amber-700 leading-tight"
                              >
                                • {m}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Forensic Summary + Identity + Hard Cap */}
                <Accordion
                  type="multiple"
                  defaultValue={["forensic"]}
                >
                  <AccordionItem value="forensic">
                    <AccordionTrigger className="text-sm font-semibold text-slate-900">
                      Forensic Summary
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {forensic.headline}
                          </p>
                          {riskBadge(forensic.risk_level)}
                        </div>
                        {forensic.statute_citations.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">
                              Statute Citations:
                            </p>
                            {forensic.statute_citations.map(
                              (c: string, i: number) => (
                                <p
                                  key={i}
                                  className="text-xs text-red-700"
                                >
                                  • {c}
                                </p>
                              )
                            )}
                          </div>
                        )}
                        {forensic.questions_to_ask.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">
                              Questions to Ask:
                            </p>
                            {forensic.questions_to_ask.map(
                              (q: string, i: number) => (
                                <p
                                  key={i}
                                  className="text-xs text-slate-700"
                                >
                                  • {q}
                                </p>
                              )
                            )}
                          </div>
                        )}
                        {forensic.positive_findings.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">
                              Positive Findings:
                            </p>
                            {forensic.positive_findings.map(
                              (p: string, i: number) => (
                                <p
                                  key={i}
                                  className="text-xs text-emerald-700"
                                >
                                  ✓ {p}
                                </p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="identity">
                    <AccordionTrigger className="text-sm font-semibold text-slate-900">
                      Extracted Identity
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> Contractor
                          </p>
                          <p className="text-slate-700">
                            {identity.contractor_name ?? "—"}
                          </p>
                          <p className="text-slate-700 font-mono">
                            License: {identity.contractor_license ?? "—"}
                          </p>
                          <p className="text-slate-700">
                            {identity.contractor_phone ?? "—"}
                          </p>
                          <p className="text-slate-700">
                            {identity.contractor_email ?? "—"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-500 flex items-center gap-1">
                            <User className="h-3 w-3" /> Homeowner
                          </p>
                          <p className="text-slate-700">
                            {identity.homeowner_name ?? "—"}
                          </p>
                          <p className="text-slate-700 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {identity.homeowner_city ?? "—"},{" "}
                            {identity.homeowner_zip ?? "—"}
                          </p>
                        </div>
                      </div>
                      {identity.noa_numbers.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-500">
                            NOA Numbers:
                          </p>
                          <p className="text-xs text-slate-700 font-mono">
                            {identity.noa_numbers.join(", ")}
                          </p>
                        </div>
                      )}
                      {identity.fl_approval_numbers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-slate-500">
                            FL Approval Numbers:
                          </p>
                          <p className="text-xs text-slate-700 font-mono">
                            {identity.fl_approval_numbers.join(", ")}
                          </p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="hardcap">
                    <AccordionTrigger className="text-sm font-semibold text-slate-900">
                      Hard Cap Details
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-xs space-y-1 font-mono text-slate-700">
                        <p>
                          Applied:{" "}
                          <span
                            className={
                              scored.hardCap.applied
                                ? "text-red-700 font-bold"
                                : "text-emerald-700"
                            }
                          >
                            {scored.hardCap.applied ? "YES" : "No"}
                          </span>
                        </p>
                        <p>Ceiling: {scored.hardCap.ceiling ?? "—"}</p>
                        <p>Reason: {scored.hardCap.reason ?? "—"}</p>
                        <p>Statute: {scored.hardCap.statute ?? "—"}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
