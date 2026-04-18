import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const REACTIONS = [
  { type: "like", emoji: "👍", color: "text-blue-500" },
  { type: "love", emoji: "❤️", color: "text-red-500" },
  { type: "haha", emoji: "😂", color: "text-yellow-500" },
  { type: "wow", emoji: "😮", color: "text-yellow-400" },
  { type: "sad", emoji: "😢", color: "text-yellow-400" },
  { type: "angry", emoji: "😡", color: "text-orange-500" },
] as const;

type ReactionType = typeof REACTIONS[number]["type"];

interface ReactionPickerProps {
  targetType: "series" | "chapter";
  targetId: number;
  total?: number;
  myReaction?: string | null;
  counts?: Record<string, number>;
  onReact?: (reactionType: ReactionType) => void;
  compact?: boolean;
}

export function ReactionPicker({ targetType, targetId, total = 0, myReaction, counts = {}, onReact, compact = false }: ReactionPickerProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showPicker, setShowPicker] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentReaction = REACTIONS.find((r) => r.type === myReaction);
  const topReactions = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => REACTIONS.find((r) => r.type === type))
    .filter(Boolean);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowPicker(true), 300);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setShowPicker(false); setHovered(false); }, 300);
  };

  const handleClick = () => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!showPicker) {
      const defaultReaction = myReaction ? (myReaction as ReactionType) : "like";
      onReact?.(defaultReaction);
    }
  };

  const handleReactionSelect = (reactionType: ReactionType) => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    setShowPicker(false);
    setHovered(false);
    onReact?.(reactionType);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <div
        className={`relative flex items-center gap-1.5 rounded-full transition-all cursor-pointer select-none ${
          compact ? "px-2.5 py-1 text-sm" : "px-3 py-1.5"
        } ${currentReaction ? "bg-accent font-medium" : "hover:bg-accent/50"}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-testid={`reaction-btn-${targetType}-${targetId}`}
      >
        {topReactions.length > 0 && (
          <span className="flex -space-x-1">
            {topReactions.map((r) => (
              <span key={r!.type} className="text-base leading-none">{r!.emoji}</span>
            ))}
          </span>
        )}
        {topReactions.length === 0 && (
          <span className={`text-base leading-none ${currentReaction ? "" : "grayscale opacity-60"}`}>
            {currentReaction ? currentReaction.emoji : "👍"}
          </span>
        )}
        {total > 0 && (
          <span className={`text-xs font-medium ${currentReaction ? "text-foreground" : "text-muted-foreground"}`}>
            {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
          </span>
        )}
        {total === 0 && !compact && (
          <span className="text-xs text-muted-foreground">{t("reactions.like")}</span>
        )}
      </div>

      {showPicker && (
        <div
          className="absolute bottom-full left-0 mb-1 z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-xl">
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                className={`text-2xl leading-none p-1 rounded-full transition-all hover:scale-125 hover:bg-accent/50 ${
                  myReaction === r.type ? "scale-110 ring-2 ring-offset-1 ring-foreground/20" : ""
                }`}
                onClick={() => handleReactionSelect(r.type)}
                title={t(`reactions.${r.type}`)}
                data-testid={`reaction-${r.type}`}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
