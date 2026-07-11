import {
  computeReadiness,
  generateMissions as localMissions,
  affordabilityTier,
  needsNoCostPath,
  type UserProfile,
  type Mission,
} from "./readiness";
import { apiPost, apiGet, apiPut } from "./api";

function deriveMetrics(profile: UserProfile) {
  const utilization =
    profile.credit.totalCardLimit > 0
      ? (profile.credit.totalCardBalance / profile.credit.totalCardLimit) * 100
      : 0;
  const dti =
    profile.finances.annualIncome > 0
      ? ((profile.finances.monthlyDebtPayments * 12) /
          profile.finances.annualIncome) *
        100
      : 0;
  return { utilization, dti };
}

/**
 * A stable fingerprint of the profile fields that shape the plan and missions.
 * The backend stores this alongside the generated content — if it matches on
 * the next request, nothing is regenerated.
 *
 * Values are rounded deliberately: paying $3 off a card shouldn't invalidate
 * a 12-month roadmap.
 */
export function planSignature(profile: UserProfile): string {
  const { utilization, dti } = deriveMetrics(profile);
  const r = computeReadiness(profile);
  return JSON.stringify({
    t: profile.goal.timeframeMonths,
    s: r.score,
    b: r.topBlocker,
    u: Math.round(utilization),
    d: Math.round(dti),
    p: profile.credit.onTimePaymentRate,
    i: profile.credit.hardInquiries,
    v: Math.round(profile.finances.savings),
    c: Math.round(profile.finances.monthlyPaydownCapacity),
  });
}

function basePayload(profile: UserProfile) {
  const result = computeReadiness(profile);
  const { utilization, dti } = deriveMetrics(profile);
  return {
    signature: planSignature(profile),
    score: result.score,
    topBlocker: result.topBlocker,
    timeframeMonths: profile.goal.timeframeMonths,
    breakdown: result.breakdown,
    utilization,
    dti,
    onTimePaymentRate: profile.credit.onTimePaymentRate,
    hardInquiries: profile.credit.hardInquiries,
    savings: profile.finances.savings,
    monthlyPaydownCapacity: profile.finances.monthlyPaydownCapacity,
    affordability: affordabilityTier(profile),
  };
}

export async function fetchCoachMissions(
  profile: UserProfile
): Promise<{ missions: Mission[]; source: "ai" | "local" }> {
  try {
    const data = await apiPost<{ missions: any[] }>(
      "/api/coach/missions",
      basePayload(profile)
    );
    const missions: Mission[] = data.missions.map((m, i) => ({
      id: `${m.factor}-${i}`.toLowerCase().replace(/\s+/g, "-"),
      factor: m.factor,
      title: m.title,
      detail: m.detail,
      impact: m.impact,
      priority: m.priority ?? i + 1,
    }));
    return { missions, source: "ai" };
  } catch {
    return {
      missions: localMissions(computeReadiness(profile), profile),
      source: "local",
    };
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendCoachChat(
  messages: ChatMessage[],
  profile: UserProfile
): Promise<string> {
  const result = computeReadiness(profile);
  const { utilization, dti } = deriveMetrics(profile);

  const data = await apiPost<{ reply: string }>("/api/coach/chat", {
    messages,
    context: {
      score: result.score,
      topBlocker: result.topBlocker,
      timeframeMonths: profile.goal.timeframeMonths,
      utilization,
      dti,
      onTimePaymentRate: profile.credit.onTimePaymentRate,
      hardInquiries: profile.credit.hardInquiries,
      savings: profile.finances.savings,
      scoreRange: profile.credit.scoreRange,
      monthlyPaydownCapacity: profile.finances.monthlyPaydownCapacity,
      affordability: affordabilityTier(profile),
    },
  });
  return data.reply;
}

export interface Habit {
  id: string;
  label: string;
  factor: string;
  why: string;
}

export type StopKind = "milestone" | "checkpoint";
export type StopCost = "free" | "money";

export interface Stop {
  id: string;
  month: number;
  kind: StopKind;
  title: string;
  factor: string;
  action: string;
  impact: string;
  cost: StopCost;
}

export interface CoachPlan {
  habits: Habit[];
  stops: Stop[];
}

/** Used only when the backend is unreachable, so the app still renders. */
function localPlan(profile: UserProfile): CoachPlan {
  const result = computeReadiness(profile);
  const n = Math.max(1, Math.min(profile.goal.timeframeMonths, 36));
  const weakest = [...result.breakdown].sort((a, b) => a.score - b.score);
  const noCost = needsNoCostPath(profile);

  const habits: Habit[] = [
    {
      id: "h-pay",
      label: "Pay every bill on time",
      factor: "Payment history",
      why: "Payment history is the biggest factor in your score — and it's free.",
    },
    {
      id: "h-util",
      label: "Keep card balances as low as you can",
      factor: "Utilization",
      why: "Low balances relative to limits lift your score.",
    },
    {
      id: "h-inq",
      label: "Avoid new hard inquiries",
      factor: "Recent inquiries",
      why: "New applications can dip your score before you apply.",
    },
    {
      id: "h-save",
      label: "Set aside what you can each month",
      factor: "Savings buffer",
      why: "Reserves strengthen your mortgage application.",
    },
  ];

  const freeActions = [
    {
      title: "Request a limit increase",
      factor: "Utilization",
      action:
        "Ask your card issuer for a credit limit increase, and request a soft pull so it doesn't add a hard inquiry.",
      impact: "Lowers utilization at zero cost",
    },
    {
      title: "Review report for errors",
      factor: "Disputes",
      action:
        "Read your report line by line. Note anything genuinely inaccurate — accounts that aren't yours, wrong balances, wrong dates.",
      impact: "Errors are free to fix",
    },
    {
      title: "File your disputes",
      factor: "Disputes",
      action:
        "Send dispute letters for the inaccurate items you found. The bureaus must investigate within 30 days.",
      impact: "Removes information that shouldn't be there",
    },
  ];

  const stops: Stop[] = [];
  for (let month = 1; month <= n; month++) {
    if (month === n) {
      stops.push({
        id: `s-${month}`,
        month,
        kind: "milestone",
        title: "Get pre-approved",
        factor: "Mortgage prep",
        action:
          "Apply for mortgage pre-approval and avoid opening any new credit beforehand.",
        impact: "Ready to make an offer",
        cost: "free",
      });
    } else if (month % 3 === 1) {
      const idx = Math.floor(month / 3);
      if (noCost) {
        const a = freeActions[idx % freeActions.length];
        stops.push({
          id: `s-${month}`,
          month,
          kind: "milestone",
          title: a.title,
          factor: a.factor,
          action: a.action,
          impact: a.impact,
          cost: "free",
        });
      } else {
        const f = weakest[idx % weakest.length];
        stops.push({
          id: `s-${month}`,
          month,
          kind: "milestone",
          title: `Improve ${f.label.toLowerCase()}`,
          factor: f.label,
          action: `Put your spare $${profile.finances.monthlyPaydownCapacity}/mo toward strengthening your ${f.label.toLowerCase()}.`,
          impact: "Moves a key factor forward",
          cost: "money",
        });
      }
    } else {
      stops.push({
        id: `s-${month}`,
        month,
        kind: "checkpoint",
        title: "Hold steady",
        factor: "Payment history",
        action:
          "No new action this month — keep your habits going and let recent changes re-report.",
        impact: "Consistency compounds",
        cost: "free",
      });
    }
  }

  return { habits, stops };
}

export async function fetchCoachPlan(
  profile: UserProfile
): Promise<{ plan: CoachPlan; source: "ai" | "local" }> {
  try {
    const data = await apiPost<CoachPlan & { source?: string }>(
      "/api/coach/plan",
      basePayload(profile)
    );
    return {
      plan: { habits: data.habits, stops: data.stops },
      source: (data.source as "ai" | "local") ?? "ai",
    };
  } catch {
    return { plan: localPlan(profile), source: "local" };
  }
}

export interface Progress {
  activeHabits: string[];
  doneStops: string[];
}

export async function fetchProgress(): Promise<Progress> {
  try {
    return await apiGet<Progress>("/api/progress");
  } catch {
    return { activeHabits: [], doneStops: [] };
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  await apiPut("/api/progress", p).catch(() => {});
}

export type LetterType =
  | "bureau_dispute"
  | "debt_validation"
  | "personal_info"
  | "goodwill";

export interface DisputeInput {
  letterType: LetterType;
  fullName: string;
  address: string;
  recipient: string;
  itemDescription: string;
  reasonInaccurate: string;
}

export async function generateDisputeLetter(
  input: DisputeInput
): Promise<{ letter: string; guidance: string }> {
  return apiPost("/api/dispute/letter", input);
}