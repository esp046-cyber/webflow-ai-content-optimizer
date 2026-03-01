import { cn, scoreColor } from "@/lib/utils";

interface SeoScoreRingProps {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

export function SeoScoreRing({
  score,
  size = 80,
  label,
  className,
}: SeoScoreRingProps) {
  const r = size / 2 - 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= 80 ? "#16a34a" : score >= 60 ? "#ca8a04" : score >= 40 ? "#ea580c" : "#dc2626";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={6}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-bold"
          style={{ fill: strokeColor, fontSize: size * 0.2 + "px", fontWeight: 700 }}
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="text-xs text-muted-foreground text-center">{label}</span>
      )}
    </div>
  );
}

interface SeoScoreBreakdownProps {
  scores: {
    overall: number;
    title: number;
    meta: number;
    readability: number;
    keywordDensity: number;
    eeAt: number;
    suggestions?: string[];
  };
}

export function SeoScoreBreakdown({ scores }: SeoScoreBreakdownProps) {
  const dimensions = [
    { key: "title", label: "Title", value: scores.title, weight: "25%" },
    { key: "meta", label: "Meta Desc", value: scores.meta, weight: "20%" },
    { key: "readability", label: "Readability", value: scores.readability, weight: "20%" },
    { key: "keywordDensity", label: "Keywords", value: scores.keywordDensity, weight: "15%" },
    { key: "eeAt", label: "E-E-A-T", value: scores.eeAt, weight: "20%" },
  ];

  return (
    <div className="space-y-3">
      {dimensions.map((dim) => (
        <div key={dim.key} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {dim.label}
              <span className="ml-1 text-muted-foreground/60">({dim.weight})</span>
            </span>
            <span className={cn("font-medium", scoreColor(dim.value))}>
              {dim.value}/100
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${dim.value}%`,
                backgroundColor:
                  dim.value >= 80
                    ? "#16a34a"
                    : dim.value >= 60
                    ? "#ca8a04"
                    : dim.value >= 40
                    ? "#ea580c"
                    : "#dc2626",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
