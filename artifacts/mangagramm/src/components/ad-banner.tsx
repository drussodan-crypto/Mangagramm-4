/**
 * AdBanner — Bannière publicitaire pour les chapitres gratuits.
 *
 * Pour activer Google AdSense en production :
 * 1. Ajoutez le script AdSense dans index.html :
 *    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
 * 2. Remplacez les valeurs data-ad-client et data-ad-slot ci-dessous.
 * 3. Décommentez le bloc AdSense et supprimez le placeholder.
 */

interface AdBannerProps {
  slot?: "between-pages" | "footer" | "sidebar";
}

export function AdBanner({ slot = "between-pages" }: AdBannerProps) {
  const isVertical = slot === "sidebar";

  return (
    <div
      className={`w-full max-w-2xl mx-auto my-1 overflow-hidden rounded-sm ${isVertical ? "h-64" : "h-24 sm:h-28"}`}
      data-testid="ad-banner"
      aria-label="Publicité"
    >
      {/*
        ── Production AdSense ──
        Décommenter et remplacer ca-pub-XXXXXXX et le slot ID :

        <ins
          className="adsbygoogle block"
          style={{ display: "block" }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <script>{`(adsbygoogle = window.adsbygoogle || []).push({});`}</script>
      */}

      {/* ── Placeholder visible en développement ── */}
      <div className={`w-full h-full flex items-center justify-center bg-zinc-800/60 border border-white/5 ${isVertical ? "flex-col gap-2" : "gap-4"}`}>
        <div className="text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium mb-0.5">Publicité</p>
          <p className="text-xs text-gray-500">Soutenez MangaGramm</p>
        </div>
        <div className={`flex items-center justify-center rounded bg-zinc-700/50 border border-white/5 ${isVertical ? "w-full h-32" : "h-12 w-48"}`}>
          <span className="text-[10px] text-gray-600 font-mono">AD SPACE · {isVertical ? "300×250" : "728×90"}</span>
        </div>
      </div>
    </div>
  );
}
