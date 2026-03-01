import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  color?: "blue" | "green" | "yellow" | "purple" | "orange";
  className?: string;
}

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600 bg-blue-100",
    value: "text-blue-700",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600 bg-green-100",
    value: "text-green-700",
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600 bg-yellow-100",
    value: "text-yellow-700",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600 bg-purple-100",
    value: "text-purple-700",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "text-orange-600 bg-orange-100",
    value: "text-orange-700",
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  className,
}: MetricCardProps) {
  const colors = COLOR_MAP[color];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", colors.value)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  trend.positive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
                <span className="text-muted-foreground font-normal">vs prev</span>
              </p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-lg", colors.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
