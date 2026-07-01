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
    onTimePaymentRate: number; // 0-100
    numAccounts: number;
    hardInquiries: number;
  };
}

export interface ReadinessBreakdown {
  label: string;
  score: number; // 0-100, higher = healthier
}

export interface ReadinessResult {
  score: number; // overall 0-100
  breakdown: ReadinessBreakdown[];
  topBlocker: string;
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