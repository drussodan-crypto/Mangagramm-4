import { Link } from "wouter";
import { Eye, Heart, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SeriesCardProps {
  id: number;
  title: string;
  coverImage?: string | null;
  type: string;
  status: string;
  authorName: string;
  chapterCount: number;
  viewCount: number;
  likeCount: number;
  genres?: string[];
}

export function SeriesCard({ id, title, coverImage, type, status, authorName, chapterCount, viewCount, likeCount, genres }: SeriesCardProps) {
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
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-background/90 backdrop-blur-sm border-0">
              {type}
            </Badge>
          </div>
          {status !== "ongoing" && (
            <div className="absolute top-2 right-2">
              <Badge variant={status === "completed" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-5">
                {status}
              </Badge>
            </div>
          )}
        </div>
        <div className="mt-2 space-y-1">
          <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-foreground/80 transition-colors">{title}</h3>
          <p className="text-xs text-muted-foreground">{authorName}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {likeCount}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {chapterCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
