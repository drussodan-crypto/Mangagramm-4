import { cn } from "@/lib/utils";

export interface ClassInfo {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
  discount: number;
  color: string;
}

export const CLASS_LEVELS: ClassInfo[] = [
  { level: 4, name: "Classe 4", minXp: 0, maxXp: 99, discount: 0, color: "#6b7280" },
  { level: 3, name: "Classe 3", minXp: 100, maxXp: 299, discount: 0, color: "#3b82f6" },
  { level: 2, name: "Classe 2", minXp: 300, maxXp: 599, discount: 0, color: "#8b5cf6" },
  { level: 1, name: "Classe 1", minXp: 600, maxXp: 999, discount: 5, color: "#f59e0b" },
  { level: 0, name: "Classe S", minXp: 1000, maxXp: 1999, discount: 15, color: "#ef4444" },
  { level: -1, name: "Niveau Dieu", minXp: 2000, maxXp: Infinity, discount: 25, color: "#a855f7" },
];

export function getClassForXp(xp: number): ClassInfo {
  for (const cls of [...CLASS_LEVELS].reverse()) {
    if (xp >= cls.minXp) return cls;
  }
  return CLASS_LEVELS[0];
}

interface ClassBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
  showXp?: boolean;
  showDiscount?: boolean;
  className?: string;
}

export function ClassBadge({ xp, size = "md", showXp = false, showDiscount = false, className }: ClassBadgeProps) {
  const cls = getClassForXp(xp);
  const isDieu = cls.level === -1;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-bold tracking-wide",
        sizeClasses[size],
        isDieu && "animate-pulse",
        className
      )}
      style={{
        color: cls.color,
        border: `1px solid ${cls.color}`,
        boxShadow: `0 0 8px ${cls.color}40, inset 0 0 4px ${cls.color}10`,
        backgroundColor: `${cls.color}10`,
        textShadow: isDieu ? `0 0 8px ${cls.color}` : undefined,
      }}
      title={`${cls.name} — ${xp} XP${cls.discount > 0 ? ` — ${cls.discount}% de réduction` : ""}`}
    >
      {isDieu ? "⚡" : "◆"} {cls.name}
      {showXp && <span className="opacity-70">({xp} XP)</span>}
      {showDiscount && cls.discount > 0 && <span className="ml-1 opacity-80">-{cls.discount}%</span>}
    </span>
  );
}

interface XpProgressBarProps {
  xp: number;
  className?: string;
}

export function XpProgressBar({ xp, className }: XpProgressBarProps) {
  const cls = getClassForXp(xp);
  const nextIdx = CLASS_LEVELS.indexOf(cls) - 1;
  const nextCls = nextIdx >= 0 ? CLASS_LEVELS[nextIdx] : null;

  const progress = nextCls
    ? Math.min(100, Math.round(((xp - cls.minXp) / (nextCls.minXp - cls.minXp)) * 100))
    : 100;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs">
        <span style={{ color: cls.color }} className="font-semibold">{cls.name}</span>
        {nextCls ? (
          <span className="text-muted-foreground">{xp} / {nextCls.minXp} XP → {nextCls.name}</span>
        ) : (
          <span className="text-muted-foreground">{xp} XP — Niveau maximum</span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: cls.color,
            boxShadow: `0 0 6px ${cls.color}`,
          }}
        />
      </div>
    </div>
  );
}
