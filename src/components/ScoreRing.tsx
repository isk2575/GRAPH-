interface ScoreRingProps {
  label: string;
  score: number; // 0–100
  size?: number;
}

export default function ScoreRing({ label, score, size = 108 }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // Color shifts with health: red when weak, amber mid, green strong.
  const color =
    clamped < 50 ? "#E50914" : clamped < 75 ? "#F5A524" : "#22C55E";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-white">{clamped}%</span>
        </div>
      </div>
      <p className="text-center text-xs font-semibold text-white/60">{label}</p>
    </div>
  );
}