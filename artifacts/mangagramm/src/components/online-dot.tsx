interface OnlineDotProps {
  lastSeenAt?: string | null;
  hideOnlineStatus?: boolean;
  className?: string;
  size?: "sm" | "md";
}

function isOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
}

export function OnlineDot({ lastSeenAt, hideOnlineStatus, className = "", size = "sm" }: OnlineDotProps) {
  if (hideOnlineStatus || !isOnline(lastSeenAt)) return null;
  const sz = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  return (
    <span
      className={`block rounded-full bg-green-500 ring-2 ring-background ${sz} ${className}`}
      title="En ligne"
    />
  );
}

export function AvatarWithOnline({
  children,
  lastSeenAt,
  hideOnlineStatus,
  size = "sm",
}: {
  children: React.ReactNode;
  lastSeenAt?: string | null;
  hideOnlineStatus?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="relative inline-block">
      {children}
      <div className="absolute bottom-0 right-0 translate-x-0.5 translate-y-0.5">
        <OnlineDot lastSeenAt={lastSeenAt} hideOnlineStatus={hideOnlineStatus} size={size} />
      </div>
    </div>
  );
}
