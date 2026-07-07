import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useUser } from "../context/UserContext";
import { computeReadiness, type Mission } from "../lib/readiness";
import { fetchCoachMissions } from "../lib/coachApi";

export default function Roadmap() {
  const navigate = useNavigate();
  const { profile } = useUser();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"ai" | "local">("ai");
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCoachMissions(profile).then(({ missions, source }) => {
      if (!cancelled) {
        setMissions(missions);
        setSource(source);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const toggle = (id: string) =>
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white antialiased">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        <h1 className="text-3xl font-black tracking-tight">
          Your action roadmap
        </h1>
        {loading ? (
          <p className="mt-2 text-white/55">
            GRAPH Coach is building your roadmap…
          </p>
        ) : (
          <p className="mt-2 text-white/55">
            {done.size} of {missions.length} missions complete
            {source === "ai" && (
              <span className="ml-2 text-[#E50914]">
                ✦ AI-generated
              </span>
            )}
          </p>
        )}

        <div className="mt-8 space-y-4">
          {missions.map((m) => {
            const isDone = done.has(m.id);
            return (
              <div
                key={m.id}
                className={`rounded-2xl border p-6 transition ${
                  isDone
                    ? "border-white/[0.06] bg-[#111113] opacity-60"
                    : "border-white/[0.08] bg-[#141416]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button onClick={() => toggle(m.id)} className="mt-0.5">
                    {isDone ? (
                      <CheckCircle2 size={22} className="text-[#E50914]" />
                    ) : (
                      <Circle size={22} className="text-white/30" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E50914]">
                      Priority {m.priority} · {m.factor}
                    </p>
                    <p
                      className={`mt-1 font-semibold ${
                        isDone ? "line-through" : ""
                      }`}
                    >
                      {m.title}
                    </p>
                    <p className="mt-2 text-sm text-white/55">{m.detail}</p>
                    <p className="mt-2 text-sm font-semibold text-white/70">
                      Impact: {m.impact}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && missions.length === 0 && (
            <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-white/55">
              No missions right now — your profile is in strong shape.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}