import {
  computeReadiness,
  generateMissions as localMissions,
  type UserProfile,
  type Mission,
} from "./readiness";

const API_BASE = "http://localhost:8000";

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

export async function fetchCoachMissions(
  profile: UserProfile
): Promise<{ missions: Mission[]; source: "ai" | "local" }> {
  const result = computeReadiness(profile);
  const { utilization, dti } = deriveMetrics(profile);

  try {
    const res = await fetch(`${API_BASE}/api/coach/missions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: result.score,
        topBlocker: result.topBlocker,
        timeframeMonths: profile.goal.timeframeMonths,
        breakdown: result.breakdown,
        utilization,
        dti,
        onTimePaymentRate: profile.credit.onTimePaymentRate,
        hardInquiries: profile.credit.hardInquiries,
        savings: profile.finances.savings,
      }),
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    const data = await res.json();
    const missions: Mission[] = data.missions.map((m: any, i: number) => ({
      id: `${m.factor}-${i}`.toLowerCase().replace(/\s+/g, "-"),
      factor: m.factor,
      title: m.title,
      detail: m.detail,
      impact: m.impact,
      priority: m.priority ?? i + 1,
    }));
    return { missions, source: "ai" };
  } catch {
    return { missions: localMissions(result), source: "local" };
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

  const res = await fetch(`${API_BASE}/api/coach/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
      },
    }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  const data = await res.json();
  return data.reply;
}

export interface Habit {
  id: string;
  label: string;
  factor: string;
  why: string;
}

export type StopKind = "milestone" | "checkpoint";

export interface Stop {
  id: string;
  month: number;
  kind: StopKind;
  title: string;
  factor: string;
  action: string;
  impact: string;
}

export interface CoachPlan {
  habits: Habit[];
  stops: Stop[];
}

function planSignature(profile: UserProfile): string {
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
  });
}

const PLAN_CACHE_KEY = "graph_plan_cache";

function localPlan(profile: UserProfile): CoachPlan {
  const result = computeReadiness(profile);
  const n = Math.max(1, Math.min(profile.goal.timeframeMonths, 36));
  const weakest = [...result.breakdown].sort((a, b) => a.score - b.score);

  const habits: Habit[] = [
    {
      id: "h-pay",
      label: "Pay every bill on time",
      factor: "Payment history",
      why: "Payment history is the biggest factor in your score.",
    },
    {
      id: "h-util",
      label: "Keep card utilization low",
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
      label: "Set aside savings each month",
      factor: "Savings buffer",
      why: "Reserves strengthen your mortgage application.",
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
      });
    } else if (month % 3 === 1) {
      // A discrete action roughly every third month.
      const f = weakest[Math.floor(month / 3) % weakest.length];
      stops.push({
        id: `s-${month}`,
        month,
        kind: "milestone",
        title: `Improve ${f.label.toLowerCase()}`,
        factor: f.label,
        action: `Take a concrete step to strengthen your ${f.label.toLowerCase()} this month.`,
        impact: "Moves a key factor forward",
      });
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
      });
    }
  }

  return { habits, stops };
}

export async function fetchCoachPlan(
  profile: UserProfile
): Promise<{ plan: CoachPlan; source: "ai" | "local" }> {
  const signature = planSignature(profile);

  try {
    const cachedRaw = localStorage.getItem(PLAN_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached.signature === signature && cached.plan?.stops) {
        return { plan: cached.plan, source: cached.source ?? "ai" };
      }
    }
  } catch {
    /* ignore cache errors */
  }

  const result = computeReadiness(profile);
  const { utilization, dti } = deriveMetrics(profile);

  let plan: CoachPlan;
  let source: "ai" | "local";

  try {
    const res = await fetch(`${API_BASE}/api/coach/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: result.score,
        topBlocker: result.topBlocker,
        timeframeMonths: profile.goal.timeframeMonths,
        breakdown: result.breakdown,
        utilization,
        dti,
        onTimePaymentRate: profile.credit.onTimePaymentRate,
        hardInquiries: profile.credit.hardInquiries,
        savings: profile.finances.savings,
      }),
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    plan = (await res.json()) as CoachPlan;
    source = "ai";
  } catch {
    plan = localPlan(profile);
    source = "local";
  }

  try {
    localStorage.setItem(
      PLAN_CACHE_KEY,
      JSON.stringify({ signature, plan, source })
    );
  } catch {
    /* ignore */
  }

  return { plan, source };
}