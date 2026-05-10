import { useEffect, useState } from "react";

function BrushLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="9" y="0" width="10" height="24" rx="5" fill="currentColor" opacity="0.9"/>
      <rect x="9" y="7" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
      <rect x="9" y="11" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
      <rect x="9" y="15" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
      <rect x="7" y="24" width="14" height="6" rx="2" fill="currentColor" opacity="0.6"/>
      <rect x="7" y="24" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.85"/>
      <path d="M7 30 L21 30 L19 38 L9 38 Z" fill="currentColor"/>
      <path d="M9 38 Q14 52 14 52 Q14 52 19 38 Z" fill="currentColor"/>
      <ellipse cx="14" cy="46" rx="2" ry="3.5" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

interface SplashScreenProps {
  show: boolean;
  onDone?: () => void;
}

export function SplashScreen({ show, onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(show);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setFading(false);
      const t1 = setTimeout(() => setFading(true), 700);
      const t2 = setTimeout(() => { setVisible(false); onDone?.(); }, 1000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="relative">
          <BrushLogo className="w-16 h-28 text-foreground" />
          {/* Ink drop animation */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
        <p className="font-serif text-3xl font-bold tracking-tight">MangaGramm</p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook: show splash for 1 second on mount or on demand
export function useSplash() {
  const [show, setShow] = useState(false);
  const trigger = () => setShow(true);
  const onDone = () => setShow(false);
  return { show, trigger, onDone };
}
