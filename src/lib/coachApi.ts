import {
  computeReadiness,
  generateMissions as localMissions,
  type UserProfile,
  type Mission,
} from "./readiness";

const API_BASE = "http://localhost:8000";

export async function fetchCoachMissions(
  profile: UserProfile
): Promise<{ missions: Mission[]; source: "ai" | "local" }> {
  const result = computeReadiness(profile);

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
    // Backend unavailable — fall back to deterministic templates so the
    // app still works (and the demo never dies on a network hiccup).
    return { missions: localMissions(result), source: "local" };
  }
}