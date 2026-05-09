import { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetSeries, useCheckFavorite, useCheckFollow, useToggleFavorite, useToggleFollow, getGetSeriesQueryKey, getCheckFavoriteQueryKey, getCheckFollowQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { ReactionPicker } from "@/components/reaction-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, Eye, BookOpen, UserPlus, UserCheck, PenTool, Trash2, Lock, Coins } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const seriesId = parseInt(id || "0", 10);
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [reactionData, setReactionData] = useState<{ total: number; counts: Record<string, number>; myReaction: string | null }>({
    total: 0, counts: {}, myReaction: null,
  });
  const [deletingChapterId, setDeletingChapterId] = useState<number | null>(null);

  const { data: series, isLoading } = useGetSeries(seriesId, {
    query: { enabled: !!seriesId, queryKey: getGetSeriesQueryKey(seriesId) },
  });

  useEffect(() => {
    if (!seriesId) return;
    fetch(`/api/reactions?targetType=series&targetId=${seriesId}`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((rd) => {
        if (rd) setReactionData(rd);
        else if (series) {
          const s = series as any;
          setReactionData({ total: s.likeCount || 0, counts: { like: s.likeCount || 0 }, myReaction: null });
        }
      })
      .catch(() => {});
  }, [seriesId, series]);

  const { data: favStatus } = useCheckFavorite(seriesId, {
    query: { enabled: !!seriesId && isAuthenticated, queryKey: getCheckFavoriteQueryKey(seriesId) },
  });

  const authorId = (series as any)?.authorId;
  const { data: followStatus } = useCheckFollow(authorId || 0, {
    query: { enabled: !!authorId && isAuthenticated, queryKey: getCheckFollowQueryKey(authorId || 0) },
  });

  const toggleFavorite = useToggleFavorite();
  const toggleFollow = useToggleFollow();

  const handleReact = useCallback(async (reactionType: string) => {
    try {
      const res = await fetch("/api/reactions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetType: "series", targetId: seriesId, reactionType }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactionData({ total: data.total, counts: data.counts, myReaction: data.myReaction });
        queryClient.invalidateQueries({ queryKey: getGetSeriesQueryKey(seriesId) });
      }
    } catch {}
  }, [seriesId, queryClient]);

  const handleFavorite = () => {
    if (!isAuthenticated) return;
    toggleFavorite.mutate({ data: { seriesId } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(seriesId) }),
    });
  };

  const handleFollow = () => {
    if (!isAuthenticated || !authorId) return;
    toggleFollow.mutate({ authorId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getCheckFollowQueryKey(authorId) }),
    });
  };

  const handleDeleteChapter = async (chapterId: number, chapterTitle: string) => {
    if (!confirm(`Supprimer "${chapterTitle}" définitivement ? Cette action est irréversible.`)) return;
    setDeletingChapterId(chapterId);
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Chapitre supprimé", description: `"${chapterTitle}" a été supprimé.` });
        queryClient.invalidateQueries({ queryKey: getGetSeriesQueryKey(seriesId) });
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer ce chapitre.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setDeletingChapterId(null);
    }
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
        <p className="text-lg">Série introuvable</p>
      </div>
    );
  }

  const s = series as any;
  const chapters = s.chapters || [];
  const isFollowing = (followStatus as any)?.following;
  const isFavorited = (favStatus as any)?.favorited;
  const isAuthor = isAuthenticated && user?.id === s.authorId;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-series-detail">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Cover */}
        <div className="w-44 shrink-0">
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

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary">{s.type}</Badge>
              <Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge>
              {s.mature && <Badge variant="destructive">18+</Badge>}
            </div>
            <h1 className="text-2xl font-serif font-bold">{s.title}</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link href={`/profile/${s.authorId}`}>
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={s.authorAvatar || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {(s.authorName || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{s.authorName}</span>
              </div>
            </Link>
            {isAuthenticated && !isAuthor && (
              <Button size="sm" variant={isFollowing ? "secondary" : "outline"} onClick={handleFollow} className="h-7 text-xs" data-testid="button-follow">
                {isFollowing ? <><UserCheck className="w-3 h-3 mr-1" /> {t("following")}</> : <><UserPlus className="w-3 h-3 mr-1" /> {t("follow")}</>}
              </Button>
            )}
            {isAuthor && (
              <Link href={`/create/${seriesId}/chapter`}>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" data-testid="button-add-chapter">
                  <PenTool className="w-3 h-3" /> {t("add_chapter")}
                </Button>
              </Link>
            )}
          </div>

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
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {chapters.length} {t("chapters")}</span>
            <span className="flex items-center gap-1"><Bookmark className="w-4 h-4" /> {s.favoriteCount || 0}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {chapters.length > 0 && (
              <Link href={`/read/${chapters[0]?.id}`}>
                <Button size="sm" data-testid="button-start-reading">{t("start_reading")}</Button>
              </Link>
            )}
            <ReactionPicker
              targetType="series"
              targetId={seriesId}
              total={reactionData.total}
              myReaction={reactionData.myReaction}
              counts={reactionData.counts}
              onReact={handleReact}
            />
            <Button
              variant={isFavorited ? "default" : "outline"}
              size="sm"
              onClick={handleFavorite}
              className="gap-1"
              data-testid="button-favorite-series"
            >
              <Bookmark className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? t("saved") : t("save")}
            </Button>
          </div>
        </div>
      </div>

      {/* Chapter list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("chapters")} ({chapters.length})</h2>
          {isAuthor && chapters.length > 0 && (
            <span className="text-xs text-muted-foreground">✏️ Maintenez pour modifier · 🗑️ pour supprimer</span>
          )}
        </div>
        {chapters.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("no_chapters")}</p>
        ) : (
          <div className="space-y-1">
            {chapters.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 group" data-testid={`chapter-row-${c.id}`}>
                <Link href={`/read/${c.id}`} className="flex-1" data-testid={`chapter-${c.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium w-14 shrink-0 text-muted-foreground">Ch.{c.number}</span>
                      <span className="text-sm truncate">{c.title}</span>
                      {c.isPremium && (
                        <Badge className="text-[10px] bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 shrink-0 gap-0.5">
                          <Lock className="w-2.5 h-2.5" />{c.coinPrice}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {c.viewCount}</span>
                      <span className="hidden sm:inline">{c.publishedAt ? new Date(c.publishedAt).toLocaleDateString("fr-FR") : ""}</span>
                    </div>
                  </div>
                </Link>

                {/* Author controls */}
                {isAuthor && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Link href={`/create/${seriesId}/chapter`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Modifier ce chapitre"
                        data-testid={`button-edit-chapter-${c.id}`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteChapter(c.id, c.title)}
                      disabled={deletingChapterId === c.id}
                      title="Supprimer ce chapitre"
                      data-testid={`button-delete-chapter-${c.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
