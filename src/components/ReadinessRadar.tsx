import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import type { ReadinessBreakdown } from "../lib/readiness";

export default function ReadinessRadar({
  breakdown,
}: {
  breakdown: ReadinessBreakdown[];
}) {
  const data = breakdown.map((b) => ({
    factor: b.label,
    score: Math.round(b.score),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
          />
          <Radar
            dataKey="score"
            stroke="#E50914"
            strokeWidth={2.5}
            fill="#E50914"
            fillOpacity={0.25}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}