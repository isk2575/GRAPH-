import { useEffect, useState } from "react";
import type { ReadinessBreakdown, Baseline } from "../lib/readiness";

interface Props {
  current: ReadinessBreakdown[];
  baseline: Baseline | null;
}

function healthColor(score: number): string {
  if (score < 50) return "#E50914";
  if (score < 75) return "#F5A524";
  return "#22C55E";
}

export default function ImprovementBloom({ current, baseline }: Props) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(1));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fixed factor order so each factor keeps its ring as scores change.
  const ordered = current;
  const baseMap = new Map(
    (baseline?.breakdown ?? []).map((b) => [b.label, b.score])
  );

  const cx = 130;
  const cy = 130;
  const innerRadius = 30;
  const ringGap = 17;
  const stroke = 13;

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-6">
      <div className="relative shrink-0">
        <svg width={260} height={260} viewBox="0 0 260 260">
          {ordered.map((b, i) => {
            const r = innerRadius + i * ringGap;
            const circumference = 2 * Math.PI * r;
            const baseScore = baseMap.get(b.label);
            const baseFilled =
              baseScore != null ? (baseScore / 100) * circumference : 0;

            return (
              <g key={b.label}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={stroke}
                />
                {baseScore != null && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${baseFilled} ${circumference - baseFilled}`}
                    transform={`rotate(-90 ${cx} ${cy})`}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={healthColor(b.score)}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${
                    (b.score / 100) * circumference * progress
                  } ${circumference}`}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="w-full space-y-2.5">
        {ordered.map((b) => {
          const baseScore = baseMap.get(b.label);
          const delta =
            baseScore != null ? Math.round(b.score - baseScore) : null;
          return (
            <div key={b.label} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: healthColor(b.score) }}
              />
              <span className="flex-1 text-sm font-medium text-white/70">
                {b.label}
              </span>
              {delta != null && delta !== 0 && (
                <span
                  className={`text-xs font-bold ${
                    delta > 0 ? "text-emerald-400" : "text-[#E50914]"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              )}
              <span className="w-10 text-right text-sm font-black text-white">
                {Math.round(b.score)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}