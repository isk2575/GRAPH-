import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  TrendingUp,
  CreditCard,
  PiggyBank,
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileText,
  Pencil,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { computeReadiness, type GoalType, type UserProfile } from "../lib/readiness";
import { parseCreditReport } from "../lib/parseCreditReport";

const GOALS: { type: GoalType; label: string; icon: typeof Home }[] = [
  { type: "buy_home", label: "Buy a home", icon: Home },
  { type: "improve_credit", label: "Improve credit", icon: TrendingUp },
  { type: "lower_debt", label: "Lower debt", icon: CreditCard },
  { type: "build_savings", label: "Build savings", icon: PiggyBank },
];

const TIMEFRAMES = [3, 6, 12, 24];
const SCORE_RANGES = ["<580", "580-669", "670-739", "740-799", "800+"];
const STEPS = ["Goal", "Financials", "Credit profile", "Review"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, setProfile, setOnboarded } = useUser(); // add setOnboarded
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(profile);

  // Credit step state
  const [creditMode, setCreditMode] = useState<"choose" | "upload" | "manual">(
    "choose"
  );
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedFields, setParsedFields] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const result = computeReadiness(draft);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => {
    if (step === 0) {
        navigate("/");
    } else {
        setStep((s) => s - 1);
    }
    };

  const finish = () => {
    setProfile(draft);
    setOnboarded(true);
    navigate("/dashboard");
  };

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setParseError("Please upload a PDF file.");
      return;
    }
    setParsing(true);
    setParseError(null);
    setFileName(file.name);
    try {
      const { data, foundFields } = await parseCreditReport(file);
      setDraft((d) => ({
        ...d,
        credit: {
          ...d.credit,
          ...(data.scoreRange && { scoreRange: data.scoreRange }),
          ...(data.totalCardLimit && { totalCardLimit: data.totalCardLimit }),
          ...(data.totalCardBalance && {
            totalCardBalance: data.totalCardBalance,
          }),
          ...(data.hardInquiries && { hardInquiries: data.hardInquiries }),
          ...(data.numAccounts && { numAccounts: data.numAccounts }),
        },
      }));
      setParsedFields(foundFields);
      setCreditMode("manual");
    } catch {
      setParseError("Couldn't read that PDF. Try entering your details manually.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white antialiased">
      <nav className="border-b border-white/[0.08] bg-[#0B0B0C]/95">
        <div className="mx-auto flex h-20 max-w-3xl items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E50914] text-base font-black text-white">
            G
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            GRAPH
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Progress */}
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-white/45">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-[#E50914] transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 0: Goal */}
        {step === 0 && (
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              What are you working toward?
            </h1>
            <p className="mt-2 text-white/55">
              This sets the mission plan GRAPH builds for you.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {GOALS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() =>
                    setDraft((d) => ({ ...d, goal: { ...d.goal, type } }))
                  }
                  className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition ${
                    draft.goal.type === type
                      ? "border-[#E50914]/60 bg-[#E50914]/[0.08]"
                      : "border-white/[0.08] bg-[#141416] hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-[#E50914]">
                    <Icon size={20} />
                  </span>
                  <span className="font-semibold text-white">{label}</span>
                </button>
              ))}
            </div>

            <p className="mb-3 mt-8 text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Timeframe
            </p>
            <div className="flex flex-wrap gap-3">
              {TIMEFRAMES.map((months) => (
                <button
                  key={months}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      goal: { ...d.goal, timeframeMonths: months },
                    }))
                  }
                  className={`rounded-full border px-5 py-2.5 text-sm font-bold transition ${
                    draft.goal.timeframeMonths === months
                      ? "border-[#E50914]/60 bg-[#E50914]/[0.08] text-white"
                      : "border-white/[0.08] bg-[#141416] text-white/60 hover:bg-white/[0.04]"
                  }`}
                >
                  {months} months
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Financials */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Your financial snapshot
            </h1>
            <p className="mt-2 text-white/55">
              Rough numbers are fine, you can update these later.
            </p>

            <div className="mt-8 space-y-5">
              <NumberField
                label="Annual income"
                prefix="$"
                value={draft.finances.annualIncome}
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    finances: { ...d.finances, annualIncome: v },
                  }))
                }
              />
              <NumberField
                label="Monthly debt payments"
                prefix="$"
                value={draft.finances.monthlyDebtPayments}
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    finances: { ...d.finances, monthlyDebtPayments: v },
                  }))
                }
              />
              <NumberField
                label="Current savings"
                prefix="$"
                value={draft.finances.savings}
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    finances: { ...d.finances, savings: v },
                  }))
                }
              />
            </div>
          </div>
        )}

        {/* Step 2: Credit profile */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Your credit profile
            </h1>
            <p className="mt-2 text-white/55">
              This is how GRAPH finds your biggest blocker.
            </p>

            {creditMode === "choose" && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setCreditMode("upload")}
                  className="flex flex-col items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-left transition hover:border-[#E50914]/40 hover:bg-white/[0.04]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E50914]/[0.12] text-[#E50914]">
                    <Upload size={20} />
                  </span>
                  <span className="text-base font-bold text-white">
                    Upload credit report
                  </span>
                  <span className="text-sm text-white/50">
                    We'll read the PDF and pre-fill your numbers.
                  </span>
                </button>

                <button
                  onClick={() => setCreditMode("manual")}
                  className="flex flex-col items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-left transition hover:border-[#E50914]/40 hover:bg-white/[0.04]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-white/70">
                    <Pencil size={20} />
                  </span>
                  <span className="text-base font-bold text-white">
                    Enter manually
                  </span>
                  <span className="text-sm text-white/50">
                    Type in your details yourself.
                  </span>
                </button>
              </div>
            )}

            {creditMode === "upload" && (
              <div className="mt-8">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.12] bg-[#141416] px-6 py-16 text-center transition hover:border-[#E50914]/50 hover:bg-white/[0.02]"
                >
                  {parsing ? (
                    <>
                      <Loader2 size={28} className="animate-spin text-[#E50914]" />
                      <span className="font-semibold text-white">
                        Reading your report…
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E50914]/[0.12] text-[#E50914]">
                        <FileText size={26} />
                      </span>
                      <span className="text-base font-bold text-white">
                        Drop your PDF here or click to browse
                      </span>
                      <span className="text-sm text-white/45">
                        PDF only. Processed in your browser — nothing is uploaded.
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </label>

                {parseError && (
                  <p className="mt-4 text-sm font-semibold text-[#E50914]">
                    {parseError}
                  </p>
                )}

                <button
                  onClick={() => setCreditMode("choose")}
                  className="mt-5 text-sm font-semibold text-white/50 hover:text-white"
                >
                  ← Back to options
                </button>
              </div>
            )}

            {creditMode === "manual" && (
              <div className="mt-8 space-y-5">
                {fileName && (
                  <div className="flex items-start gap-3 rounded-2xl border border-[#E50914]/25 bg-[#E50914]/[0.06] p-4">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-[#E50914]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Read {parsedFields.length} field
                        {parsedFields.length === 1 ? "" : "s"} from {fileName}
                      </p>
                      <p className="mt-0.5 text-sm text-white/50">
                        Double-check the values below and fix anything that looks off.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/70">
                    Credit score range
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SCORE_RANGES.map((range) => (
                      <button
                        key={range}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            credit: { ...d.credit, scoreRange: range },
                          }))
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                          draft.credit.scoreRange === range
                            ? "border-[#E50914]/60 bg-[#E50914]/[0.08] text-white"
                            : "border-white/[0.08] bg-[#141416] text-white/60 hover:bg-white/[0.04]"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <NumberField
                  label="Total credit limit (all cards)"
                  prefix="$"
                  value={draft.credit.totalCardLimit}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      credit: { ...d.credit, totalCardLimit: v },
                    }))
                  }
                />
                <NumberField
                  label="Total card balances"
                  prefix="$"
                  value={draft.credit.totalCardBalance}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      credit: { ...d.credit, totalCardBalance: v },
                    }))
                  }
                />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-white/70">
                      On-time payment rate
                    </label>
                    <span className="text-sm font-bold text-white">
                      {draft.credit.onTimePaymentRate}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draft.credit.onTimePaymentRate}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        credit: {
                          ...d.credit,
                          onTimePaymentRate: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-[#E50914]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="Open accounts"
                    value={draft.credit.numAccounts}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        credit: { ...d.credit, numAccounts: v },
                      }))
                    }
                  />
                  <NumberField
                    label="Hard inquiries (12mo)"
                    value={draft.credit.hardInquiries}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        credit: { ...d.credit, hardInquiries: v },
                      }))
                    }
                  />
                </div>

                <button
                  onClick={() => {
                    setCreditMode("choose");
                    setFileName(null);
                    setParsedFields([]);
                  }}
                  className="text-sm font-semibold text-white/50 hover:text-white"
                >
                  ← Use a different method
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Your plan is ready
            </h1>
            <p className="mt-2 text-white/55">
              Here's where you stand based on what you shared.
            </p>

            <div className="mt-8 rounded-[1.5rem] border border-white/[0.08] bg-[#141416] p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <ReviewStat title="Readiness" value={`${result.score}%`} />
                <ReviewStat
                  title="Timeline"
                  value={`${draft.goal.timeframeMonths} months`}
                />
                <ReviewStat title="Top blocker" value={result.topBlocker} />
              </div>

              <div className="mt-6 space-y-3 border-t border-white/[0.08] pt-6">
                {result.breakdown.map((b) => (
                  <div key={b.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-white/60">{b.label}</span>
                      <span className="font-semibold text-white">
                        {Math.round(b.score)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-[#E50914]"
                        style={{ width: `${Math.round(b.score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={finish}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E50914] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c90812] sm:w-auto"
            >
              <Check size={17} />
              Save my plan
            </button>
          </div>
        )}

        {/* Nav buttons */}
        {step < STEPS.length - 1 && (
          <div className="mt-10 flex items-center justify-between">
            <button
                onClick={back}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                >
                <ArrowLeft size={16} />
                Back
            </button>

            <button
              onClick={next}
              className="inline-flex items-center gap-2 rounded-full bg-[#E50914] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c90812]"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-white/70">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 focus-within:border-[#E50914]/60">
        {prefix && <span className="mr-1 text-white/40">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
        />
      </div>
    </div>
  );
}

function ReviewStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
        {title}
      </p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}