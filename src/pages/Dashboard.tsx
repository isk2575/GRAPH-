import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Target,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Map,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { computeReadiness, type Mission } from "../lib/readiness";
import { fetchCoachMissions } from "../lib/coachApi";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, reset } = useUser();
  const result = computeReadiness(profile);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [source, setSource] = useState<"ai" | "local">("ai");

  useEffect(() => {
    let cancelled = false;
    setLoadingMissions(true);
    fetchCoachMissions(profile).then(({ missions, source }) => {
      if (!cancelled) {
        setMissions(missions);
        setSource(source);
        setLoadingMissions(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white antialiased">
      <TopNav />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E50914]">
              Your readiness
            </p>
            <h1 className="mt-2 text-5xl font-black tracking-tight">
              {result.score}%
            </h1>
            <p className="mt-1 text-white/55">
              Goal: buy a home in {profile.goal.timeframeMonths} months
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08]"
          >
            <RotateCcw size={14} />
            Reset demo
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Target size={18} />}
            label="Timeline"
            value={`${profile.goal.timeframeMonths} mo`}
          />
          <StatCard
            icon={<AlertTriangle size={18} />}
            label="Top blocker"
            value={result.topBlocker}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Open missions"
            value={loadingMissions ? "…" : String(missions.length)}
          />
        </div>

        {/* Journey banner */}
        <button
          onClick={() => navigate("/journey")}
          className="mt-8 flex w-full items-center justify-between rounded-[1.5rem] border border-[#E50914]/25 bg-gradient-to-r from-[#E50914]/[0.12] to-transparent p-6 text-left transition hover:border-[#E50914]/40"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E50914] text-white">
              <Map size={22} />
            </span>
            <div>
              <p className="font-bold">Start your journey</p>
              <p className="text-sm text-white/55">
                Follow your step-by-step path to mortgage-ready
              </p>
            </div>
          </div>
          <ChevronRight size={22} className="text-[#E50914]" />
        </button>

        {/* Factor breakdown */}
        <div className="mt-8 rounded-[1.5rem] border border-white/[0.08] bg-[#141416] p-6">
          <h2 className="text-lg font-bold">Readiness breakdown</h2>
          <div className="mt-5 space-y-4">
            {result.breakdown.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-white/60">{b.label}</span>
                  <span className="font-semibold">{Math.round(b.score)}%</span>
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
          <button
            onClick={() => navigate("/credit")}
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#E50914]"
          >
            View credit detail <ChevronRight size={15} />
          </button>
        </div>

        {/* Missions preview */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your missions</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/journey")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#E50914]"
            >
              Journey <Map size={15} />
            </button>
            <button
              onClick={() => navigate("/roadmap")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#E50914]"
            >
              List <ChevronRight size={15} />
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {loadingMissions ? (
            <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5 text-white/55">
              GRAPH Coach is analyzing your profile…
            </p>
          ) : (
            <>
              {source === "ai" && (
                <p className="text-xs font-semibold text-[#E50914]">
                  ✦ Generated by GRAPH Coach AI
                </p>
              )}
              {missions.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#141416] p-5"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E50914]">
                      Priority {m.priority}
                    </p>
                    <p className="mt-1 font-semibold">{m.title}</p>
                    <p className="mt-1 text-sm text-white/45">{m.impact}</p>
                  </div>
                  <ArrowRight size={18} className="shrink-0 text-white/40" />
                </div>
              ))}
              {missions.length === 0 && (
                <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5 text-white/55">
                  No urgent blockers, you're in strong shape. 🎉
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function TopNav() {
  const navigate = useNavigate();
  return (
    <nav className="border-b border-white/[0.08] bg-[#0B0B0C]/95">
      <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E50914] text-base font-black text-white">
            G
          </div>
          <span className="text-2xl font-black tracking-tight">GRAPH</span>
        </button>
        <div className="flex items-center gap-6 text-sm font-medium text-white/60">
          <button onClick={() => navigate("/dashboard")} className="text-white">
            Dashboard
          </button>
          <button onClick={() => navigate("/journey")}>Journey</button>
          <button onClick={() => navigate("/roadmap")}>Roadmap</button>
          <button onClick={() => navigate("/credit")}>Credit</button>
        </div>
      </div>
    </nav>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <div className="flex items-center gap-2 text-[#E50914]">{icon}</div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}