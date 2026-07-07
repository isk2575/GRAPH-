export type GoalType = "buy_home" | "improve_credit" | "lower_debt" | "build_savings";

export interface UserProfile {
  goal: {
    type: GoalType;
    timeframeMonths: number;
  };
  finances: {
    annualIncome: number;
    monthlyDebtPayments: number;
    savings: number;
  };
  credit: {
    scoreRange: string;
    totalCardLimit: number;
    totalCardBalance: number;
    onTimePaymentRate: number;
    numAccounts: number;
    hardInquiries: number;
  };
}

export interface ReadinessBreakdown {
  label: string;
  score: number;
}

export interface ReadinessResult {
  score: number;
  breakdown: ReadinessBreakdown[];
  topBlocker: string;
}

export interface Mission {
  id: string;
  factor: string;
  title: string;
  detail: string;
  impact: string;
  priority: number;
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export function computeReadiness(profile: UserProfile): ReadinessResult {
  const { finances, credit } = profile;

  const utilization =
    credit.totalCardLimit > 0
      ? (credit.totalCardBalance / credit.totalCardLimit) * 100
      : 0;
  const utilizationScore = clamp(100 - utilization * 1.5);

  const dti =
    finances.annualIncome > 0
      ? ((finances.monthlyDebtPayments * 12) / finances.annualIncome) * 100
      : 100;
  const dtiScore = clamp(100 - dti * 2);

  const paymentScore = clamp(credit.onTimePaymentRate);
  const inquiryScore = clamp(100 - credit.hardInquiries * 10);

  const savingsMonths =
    finances.monthlyDebtPayments > 0
      ? finances.savings / finances.monthlyDebtPayments
      : finances.savings > 0
      ? 12
      : 0;
  const savingsScore = clamp(savingsMonths * 20);

  const breakdown: ReadinessBreakdown[] = [
    { label: "Utilization", score: utilizationScore },
    { label: "Debt-to-income", score: dtiScore },
    { label: "Payment history", score: paymentScore },
    { label: "Recent inquiries", score: inquiryScore },
    { label: "Savings buffer", score: savingsScore },
  ];

  const weights: Record<string, number> = {
    Utilization: 0.3,
    "Debt-to-income": 0.25,
    "Payment history": 0.25,
    "Recent inquiries": 0.1,
    "Savings buffer": 0.1,
  };

  const score = Math.round(
    breakdown.reduce((sum, b) => sum + b.score * weights[b.label], 0)
  );

  const topBlocker = [...breakdown].sort((a, b) => a.score - b.score)[0].label;

  return { score, breakdown, topBlocker };
}

// Mission templates keyed by factor; chosen when that factor scores low.
const MISSION_TEMPLATES: Record<
  string,
  Omit<Mission, "id" | "priority"> & { threshold: number }
> = {
  Utilization: {
    factor: "Utilization",
    title: "Pay card balances below 30% before statement date",
    detail:
      "High utilization is your biggest score drag. Paying balances down before the statement closes lowers reported utilization.",
    impact: "+20 to +40 points in 30–45 days",
    threshold: 70,
  },
  "Debt-to-income": {
    factor: "Debt-to-income",
    title: "Reduce monthly debt payments",
    detail:
      "Lenders weigh how much of your income goes to debt. Paying down or consolidating loans improves your DTI ratio.",
    impact: "Improves loan approval odds",
    threshold: 70,
  },
  "Payment history": {
    factor: "Payment history",
    title: "Set up autopay to protect payment history",
    detail:
      "Payment history is the largest factor in your score. Automating minimum payments prevents future misses.",
    impact: "Protects your biggest score factor",
    threshold: 90,
  },
  "Recent inquiries": {
    factor: "Recent inquiries",
    title: "Pause new credit applications",
    detail:
      "Each hard inquiry can dip your score. Holding off on new applications lets recent inquiries age off.",
    impact: "+5 to +10 points as inquiries age",
    threshold: 80,
  },
  "Savings buffer": {
    factor: "Savings buffer",
    title: "Build a stronger cash reserve",
    detail:
      "A larger savings buffer strengthens your mortgage application and covers closing costs and reserves.",
    impact: "Strengthens mortgage readiness",
    threshold: 60,
  },
};

export function generateMissions(result: ReadinessResult): Mission[] {
  return result.breakdown
    .filter((b) => {
      const t = MISSION_TEMPLATES[b.label];
      return t && b.score < t.threshold;
    })
    .sort((a, b) => a.score - b.score)
    .map((b, i) => {
      const t = MISSION_TEMPLATES[b.label];
      return {
        id: b.label.toLowerCase().replace(/\s+/g, "-"),
        factor: t.factor,
        title: t.title,
        detail: t.detail,
        impact: t.impact,
        priority: i + 1,
      };
    });
}

export const defaultUserProfile: UserProfile = {
  goal: { type: "buy_home", timeframeMonths: 12 },
  finances: { annualIncome: 65000, monthlyDebtPayments: 850, savings: 4200 },
  credit: {
    scoreRange: "670-739",
    totalCardLimit: 8000,
    totalCardBalance: 5200,
    onTimePaymentRate: 92,
    numAccounts: 4,
    hardInquiries: 2,
  },
};