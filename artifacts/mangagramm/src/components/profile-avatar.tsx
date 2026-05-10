import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getClassForXp } from "@/components/class-badge";
import { OnlineDot } from "@/components/online-dot";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  src?: string | null;
  name?: string | null;
  xp?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showBadge?: boolean;
  showOnline?: boolean;
  lastSeenAt?: string | null;
  hideOnlineStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZES = {
  xs: { avatar: "h-7 w-7", text: "text-[10px]", badge: 14, ring: "ring-1", dot: "w-2 h-2 -bottom-0.5 -right-0.5" },
  sm: { avatar: "h-9 w-9", text: "text-xs", badge: 16, ring: "ring-2", dot: "w-2.5 h-2.5 -bottom-0.5 -right-0.5" },
  md: { avatar: "h-12 w-12", text: "text-sm", badge: 18, ring: "ring-2", dot: "w-3 h-3 -bottom-0 -right-0" },
  lg: { avatar: "h-20 w-20", text: "text-xl", badge: 24, ring: "ring-2", dot: "w-3.5 h-3.5 bottom-0 right-0" },
  xl: { avatar: "h-28 w-28", text: "text-3xl", badge: 30, ring: "ring-[3px]", dot: "w-4 h-4 bottom-0.5 right-0.5" },
};

function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export function ProfileAvatar({
  src,
  name,
  xp = 0,
  size = "md",
  showBadge = true,
  showOnline = true,
  lastSeenAt,
  hideOnlineStatus = false,
  className,
  onClick,
}: ProfileAvatarProps) {
  const s = SIZES[size];
  const cls = getClassForXp(xp);
  const online = showOnline && !hideOnlineStatus && isOnline(lastSeenAt);
  const initials = (name || "?").charAt(0).toUpperCase();

  return (
    <div className={cn("relative inline-block shrink-0", className)} onClick={onClick} style={onClick ? { cursor: "pointer" } : {}}>
      <Avatar className={s.avatar}>
        <AvatarImage src={src || ""} />
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold" style={{ fontSize: s.badge * 0.55 }}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Class badge — bottom-left corner overlaid on avatar */}
      {showBadge && cls && (
        <span
          className={cn(
            "absolute -bottom-1 -left-1 flex items-center justify-center rounded-full font-bold leading-none shadow-md select-none z-10",
            s.ring,
            cls.ring || "ring-background",
            cls.animated && "animate-pulse",
          )}
          style={{
            width: s.badge,
            height: s.badge,
            fontSize: s.badge * 0.45,
            background: cls.gradient || cls.color,
            color: "#fff",
          }}
          title={`Classe ${cls.label}`}
        >
          {cls.label}
        </span>
      )}

      {/* Online dot — bottom-right */}
      {online && (
        <span
          className={cn("absolute rounded-full bg-green-500 ring-2 ring-background z-10", s.dot)}
          title="En ligne"
        />
      )}
    </div>
  );
}
