import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Flame, Info, Minus } from "lucide-react";
import { useUser } from "../context/UserContext";
import { computeReadiness } from "../lib/readiness";
import { fetchCoachPlan, type CoachPlan, type Stop } from "../lib/coachApi";
import RobotAvatar from "../components/RobotAvatar";

const HABITS_KEY = "graph_habits_active";
const STOPS_KEY = "graph_stops_done";

function loadSet(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Journey() {
  const navigate = useNavigate();
  const { profile } = useUser();
  const result = computeReadiness(profile);

  const [plan, setPlan] = useState<CoachPlan>({ habits: [], stops: [] });
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"ai" | "local">("ai");

  const [activeHabits, setActiveHabits] = useState<string[]>(() =>
    loadSet(HABITS_KEY)
  );
  const [doneStops, setDoneStops] = useState<string[]>(() => loadSet(STOPS_KEY));
  const [selected, setSelected] = useState<Stop | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCoachPlan(profile).then(({ plan, source }) => {
      if (!cancelled) {
        setPlan(plan);
        setSource(source);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(activeHabits));
  }, [activeHabits]);
  useEffect(() => {
    localStorage.setItem(STOPS_KEY, JSON.stringify(doneStops));
  }, [doneStops]);

  const habitActive = (id: string) => activeHabits.includes(id);
  const toggleHabit = (id: string) =>
    setActiveHabits((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );

  const stopDone = (id: string) => doneStops.includes(id);
  const toggleStop = (id: string) =>
    setDoneStops((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );

  const totalEffort = plan.habits.length + plan.stops.length;
  const doneEffort = activeHabits.length + doneStops.length;
  const momentum = totalEffort
    ? Math.round((doneEffort / totalEffort) * 100)
    : 0;

  const currentStopId = plan.stops.find((s) => !stopDone(s.id))?.id;
  const milestoneCount = plan.stops.filter((s) => s.kind === "milestone").length;

  const offsets = [0, 85, 120, 85, 0, -85, -120, -85];
  const nodeOffset = (i: number) => offsets[i % offsets.length];

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white antialiased">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0B0B0C]/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-6 py-5">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E50914]">
            Your journey {source === "ai" && <span>✦ AI plan</span>}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            {profile.goal.timeframeMonths}-month road to mortgage-ready
          </h1>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                Readiness (from your data)
              </p>
              <p className="mt-1 text-xl font-black">{result.score}%</p>
            </div>
            <div className="rounded-2xl border border-[#E50914]/25 bg-[#E50914]/[0.06] p-3">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#E50914]">
                <Flame size={11} /> Momentum (your effort)
              </p>
              <p className="mt-1 text-xl font-black">{momentum}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-32 pt-8">
        {loading ? (
          <p className="text-center text-white/55">
            GRAPH Coach is building your {profile.goal.timeframeMonths}-month plan…
          </p>
        ) : (
          <>
            {/* HABITS */}
            <section className="rounded-[1.5rem] border border-white/[0.08] bg-[#141416] p-5">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-[#E50914]" />
                <h2 className="text-sm font-black uppercase tracking-[0.14em]">
                  Daily habits
                </h2>
              </div>
              <p className="mt-1 text-sm text-white/50">
                Keep these going every single month, they run the whole journey.
              </p>

              <div className="mt-4 space-y-2">
                {plan.habits.map((h) => {
                  const on = habitActive(h.id);
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHabit(h.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                        on
                          ? "border-[#E50914]/40 bg-[#E50914]/[0.08]"
                          : "border-white/[0.08] bg-[#0F0F11] hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          on ? "border-[#E50914] bg-[#E50914]" : "border-white/25"
                        }`}
                      >
                        {on && (
                          <Check size={14} strokeWidth={3} className="text-white" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-white">
                          {h.label}
                        </span>
                        <span className="block text-xs text-white/45">{h.why}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* PATH */}
            <div className="mt-8 flex items-baseline gap-2 px-1">
              <h2 className="text-sm font-black uppercase tracking-[0.14em]">
                Your {plan.stops.length} month path
              </h2>
              <span className="text-xs text-white/40">
                · {milestoneCount} milestones
              </span>
            </div>

            <div className="relative mt-6 flex flex-col items-center">
              {plan.stops.map((s, i) => {
                const done = stopDone(s.id);
                const isCurrent = s.id === currentStopId;
                const isMilestone = s.kind === "milestone";
                const offset = nodeOffset(i);
                const nextOffset =
                  i < plan.stops.length - 1 ? nodeOffset(i + 1) : offset;

                const size = isMilestone ? 76 : 56;

                return (
                  <div
                    key={s.id}
                    className="relative flex w-full flex-col items-center"
                    style={{
                      marginBottom: i === plan.stops.length - 1 ? 0 : 22,
                    }}
                  >
                    {i < plan.stops.length - 1 && (
                      <svg
                        className="pointer-events-none absolute z-0"
                        style={{ top: size - 30, overflow: "visible" }}
                        width="300"
                        height="140"
                      >
                        <path
                          d={`M ${150 + offset} 20 Q ${
                            150 + (offset + nextOffset) / 2
                          } 80, ${150 + nextOffset} 140`}
                          stroke={done ? "#E50914" : "rgba(255,255,255,0.12)"}
                          strokeWidth="5"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray={done ? "0" : "2 12"}
                        />
                      </svg>
                    )}

                    <div
                      className="relative z-10 flex items-center gap-4"
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      <button
                        onClick={() => setSelected(s)}
                        style={{ height: size, width: size }}
                        className={`relative flex flex-col items-center justify-center rounded-full shadow-lg transition active:scale-95 ${
                          done
                            ? "border-4 border-[#E50914] bg-[#E50914]"
                            : isCurrent
                            ? "border-4 border-[#E50914] bg-[#1B1B1E]"
                            : isMilestone
                            ? "border-4 border-white/[0.14] bg-[#141416]"
                            : "border-2 border-white/[0.08] bg-[#111113]"
                        }`}
                      >
                        {done ? (
                          <Check
                            size={isMilestone ? 30 : 22}
                            strokeWidth={3}
                            className="text-white"
                          />
                        ) : isMilestone ? (
                          <>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                              Mo
                            </span>
                            <span
                              className={`text-2xl font-black leading-none ${
                                isCurrent ? "text-[#E50914]" : "text-white/50"
                              }`}
                            >
                              {s.month}
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus
                              size={14}
                              className={
                                isCurrent ? "text-[#E50914]" : "text-white/25"
                              }
                            />
                            <span
                              className={`text-[11px] font-bold ${
                                isCurrent ? "text-[#E50914]" : "text-white/35"
                              }`}
                            >
                              {s.month}
                            </span>
                          </>
                        )}
                        {isCurrent && (
                          <span className="absolute -inset-1 animate-ping rounded-full border-2 border-[#E50914]/40" />
                        )}
                      </button>

                      {isCurrent && (
                        <div className="animate-bounce-slow">
                          <RobotAvatar size={52} />
                        </div>
                      )}
                    </div>

                    <p
                      className={`relative z-10 mt-2 max-w-[220px] text-center font-semibold ${
                        isMilestone
                          ? "text-sm text-white/75"
                          : "text-xs text-white/40"
                      }`}
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      {isMilestone
                        ? `Month ${s.month} · ${s.title}`
                        : `Month ${s.month} · ${s.title}`}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex items-start gap-2 rounded-2xl border border-white/[0.08] bg-[#111113] p-4 text-xs text-white/45">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                Smaller stops are checkpoints, months where the work is simply
                sustaining your habits while earlier changes re-report. Momentum
                tracks your effort; your readiness score reflects your real
                financial data and only moves when your numbers do.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Stop detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-md rounded-t-[2rem] border border-white/[0.08] bg-[#141416] p-6 sm:rounded-[2rem]">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E50914]">
                Month {selected.month} · {selected.factor}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  selected.kind === "milestone"
                    ? "bg-[#E50914]/15 text-[#E50914]"
                    : "bg-white/[0.06] text-white/45"
                }`}
              >
                {selected.kind}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">{selected.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {selected.action}
            </p>
            <p className="mt-3 text-sm font-semibold text-white/80">
              {selected.impact}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  toggleStop(selected.id);
                  setSelected(null);
                }}
                className={`flex-1 rounded-full px-5 py-3 text-sm font-bold transition ${
                  stopDone(selected.id)
                    ? "border border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    : "bg-[#E50914] text-white hover:bg-[#c90812]"
                }`}
              >
                {stopDone(selected.id) ? "Mark as not done" : "Mark complete"}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full border border-white/[0.12] bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}