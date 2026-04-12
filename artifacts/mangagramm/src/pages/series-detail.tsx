import { useParams, Link } from "wouter";
import { useGetSeries, useCheckLike, useCheckFavorite, useCheckFollow, useToggleLike, useToggleFavorite, useToggleFollow, getGetSeriesQueryKey, getCheckLikeQueryKey, getCheckFavoriteQueryKey, getCheckFollowQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Bookmark, Eye, BookOpen, Clock, UserPlus, UserCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const seriesId = parseInt(id || "0", 10);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: series, isLoading } = useGetSeries(seriesId, {
    query: { enabled: !!seriesId, queryKey: getGetSeriesQueryKey(seriesId) },
  });

  const { data: likeStatus } = useCheckLike(
    { targetType: "series", targetId: seriesId },
    { query: { enabled: !!seriesId && isAuthenticated, queryKey: getCheckLikeQueryKey({ targetType: "series", targetId: seriesId }) } }
  );

  const { data: favStatus } = useCheckFavorite(seriesId, {
    query: { enabled: !!seriesId && isAuthenticated, queryKey: getCheckFavoriteQueryKey(seriesId) },
  });

  const authorId = (series as any)?.authorId;
  const { data: followStatus } = useCheckFollow(authorId || 0, {
    query: { enabled: !!authorId && isAuthenticated, queryKey: getCheckFollowQueryKey(authorId || 0) },
  });

  const toggleLike = useToggleLike();
  const toggleFavorite = useToggleFavorite();
  const toggleFollow = useToggleFollow();

  const handleLike = () => {
    if (!isAuthenticated) return;
    toggleLike.mutate({ data: { targetType: "series", targetId: seriesId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getCheckLikeQueryKey({ targetType: "series", targetId: seriesId }) });
        queryClient.invalidateQueries({ queryKey: getGetSeriesQueryKey(seriesId) });
      },
    });
  };

  const handleFavorite = () => {
    if (!isAuthenticated) return;
    toggleFavorite.mutate({ data: { seriesId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(seriesId) });
        queryClient.invalidateQueries({ queryKey: getGetSeriesQueryKey(seriesId) });
      },
    });
  };

  const handleFollow = () => {
    if (!isAuthenticated || !authorId) return;
    toggleFollow.mutate({ authorId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getCheckFollowQueryKey(authorId) });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-muted-foreground">
        <p className="text-lg">Series not found</p>
      </div>
    );
  }

  const s = series as any;
  const chapters = s.chapters || [];
  const isFollowing = (followStatus as any)?.following;
  const isLiked = (likeStatus as any)?.liked;
  const isFavorited = (favStatus as any)?.favorited;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-series-detail">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-48 shrink-0">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border">
            {s.coverImage ? (
              <img src={s.coverImage} alt={s.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{s.type}</Badge>
              <Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge>
              {s.mature && <Badge variant="destructive">18+</Badge>}
            </div>
            <h1 className="text-2xl font-serif font-bold">{s.title}</h1>
          </div>

          <Link href={`/profile/${s.authorId}`}>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {(s.authorName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{s.authorName}</span>
              {isAuthenticated && user?.id !== s.authorId && (
                <Button size="sm" variant={isFollowing ? "secondary" : "default"} onClick={(e) => { e.preventDefault(); handleFollow(); }} data-testid="button-follow">
                  {isFollowing ? <><UserCheck className="w-3 h-3 mr-1" /> Following</> : <><UserPlus className="w-3 h-3 mr-1" /> Follow</>}
                </Button>
              )}
            </div>
          </Link>

          {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}

          {s.genres && (s.genres as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(s.genres as string[]).map((g: string) => (
                <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {s.viewCount}</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {s.likeCount}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {s.chapterCount} chapters</span>
            <span className="flex items-center gap-1"><Bookmark className="w-4 h-4" /> {s.favoriteCount || 0}</span>
          </div>

          <div className="flex gap-2">
            {chapters.length > 0 && (
              <Link href={`/read/${chapters[0]?.id}`}>
                <Button data-testid="button-start-reading">Start Reading</Button>
              </Link>
            )}
            <Button variant={isLiked ? "default" : "outline"} onClick={handleLike} data-testid="button-like-series">
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
              {isLiked ? "Liked" : "Like"}
            </Button>
            <Button variant={isFavorited ? "default" : "outline"} onClick={handleFavorite} data-testid="button-favorite-series">
              <Bookmark className={`w-4 h-4 mr-1 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Chapters ({chapters.length})</h2>
        {chapters.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No chapters yet.</p>
        ) : (
          <div className="space-y-1">
            {chapters.map((c: any) => (
              <Link key={c.id} href={`/read/${c.id}`} data-testid={`chapter-${c.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-16">Ch. {c.number}</span>
                    <span className="text-sm">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {c.viewCount}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {c.likeCount}</span>
                    <span>{c.publishedAt ? new Date(c.publishedAt).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
