import { Link } from "wouter";
import { Eye, Heart, BookOpen, BadgeCheck } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  manga: "bg-blue-500/90 text-white",
  webtoon: "bg-purple-500/90 text-white",
  comic: "bg-orange-500/90 text-white",
  "light-novel": "bg-green-500/90 text-white",
};

const TYPE_LABELS: Record<string, string> = {
  manga: "Manga",
  webtoon: "Webtoon",
  comic: "Comics",
  "light-novel": "Light Novel",
};

interface SeriesCardProps {
  id: number;
  title: string;
  coverImage?: string | null;
  type: string;
  status: string;
  authorName: string;
  authorVerified?: boolean;
  chapterCount: number;
  viewCount: number;
  likeCount: number;
  genres?: string[];
}

export function SeriesCard({ id, title, coverImage, type, status, authorName, authorVerified, chapterCount, viewCount, likeCount, genres }: SeriesCardProps) {
  return (
    <Link href={`/series/${id}`} data-testid={`card-series-${id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border">
          {coverImage ? (
            <img src={coverImage} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent">
              <BookOpen className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          {/* Type badge — colored */}
          <div className="absolute top-2 left-2">
            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[type] || "bg-background/90 text-foreground"}`}>
              {TYPE_LABELS[type] || type}
            </span>
          </div>
          {status !== "ongoing" && (
            <div className="absolute top-2 right-2">
              <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${status === "completed" ? "bg-green-500/90 text-white" : "bg-yellow-500/90 text-black"}`}>
                {status === "completed" ? "Terminé" : "Pause"}
              </span>
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="mt-2 space-y-1">
          <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-foreground/80 transition-colors">{title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {authorName}
            {authorVerified && <BadgeCheck className="w-3 h-3 text-blue-500 shrink-0" />}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {likeCount}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {chapterCount}</span>
          </div>
          {genres && genres.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
