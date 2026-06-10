import { useGetTrending, useGetLatestUpdates, useGetTopAuthors, useGetPlatformStats } from "@workspace/api-client-react";
import { SeriesCard } from "@/components/series-card";
import { Link, useLocation } from "wouter";
import { TrendingUp, Clock, Users, BookOpen, Eye, ArrowRight, Flame, BadgeCheck, Heart, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { data: trending, isLoading: trendingLoading } = useGetTrending({ limit: 8 });
  const { data: latestUpdates, isLoading: updatesLoading } = useGetLatestUpdates({ limit: 10 });
  const { data: topAuthors, isLoading: authorsLoading } = useGetTopAuthors({ limit: 6 });
  const { data: stats } = useGetPlatformStats();
  const { user, isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();

  const [top24h, setTop24h] = useState<any[]>([]);
  const [top24hLoading, setTop24hLoading] = useState(true);
  const [featuredAuthors, setFeaturedAuthors] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/discover/top24h?limit=8")
      .then(r => r.ok ? r.json() : [])
      .then(setTop24h)
      .catch(() => setTop24h([]))
      .finally(() => setTop24hLoading(false));
    fetch("/api/discover/featured-authors?limit=6")
      .then(r => r.ok ? r.json() : [])
      .then(setFeaturedAuthors)
      .catch(() => {});
  }, []);

  const handleStartCreating = () => {
    if (isAuthenticated) {
      setLocation("/create");
    } else {
      login();
    }
  };

  const TYPE_COLORS: Record<string, string> = {
    manga: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    webtoon: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    comic: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "light-novel": "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-14" data-testid="page-home">

      {/* ── HERO ── */}
      <section className="text-center py-14 space-y-5">
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight">MangaGramm</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Découvrez, lisez et publiez manga, webtoon, comics et light novels du monde entier.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/browse">
            <Button size="lg" data-testid="button-explore">Explorer</Button>
          </Link>
          <Button size="lg" variant="outline" onClick={handleStartCreating} data-testid="button-start-creating">
            ✏️ Commencer à créer
          </Button>
        </div>
        {stats && (
          <div className="flex justify-center gap-8 pt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {stats.totalSeries} Séries</div>
            <div className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {stats.totalUsers} Membres</div>
            <div className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {stats.totalViews?.toLocaleString("fr-FR")} Vues</div>
          </div>
        )}
        {/* Genre pills */}
        <div className="flex flex-wrap justify-center gap-2 pt-3">
          {["manga", "webtoon", "comic", "light-novel"].map(t => (
            <Link key={t} href={`/browse?type=${t}`}>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${TYPE_COLORS[t]}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TOP 24H ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Top du Jour</h2>
            <Badge variant="secondary" className="text-xs">24h</Badge>
          </div>
          <Link href="/browse?sort=trending">
            <Button variant="ghost" size="sm" className="gap-1">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {top24hLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[3/4] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : top24h.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {top24h.map((s: any, i: number) => (
              <div key={s.id} className="relative">
                <div className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow">
                  {i + 1}
                </div>
                <SeriesCard {...s} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Flame className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun titre en tendance aujourd'hui. Revenez plus tard !</p>
          </div>
        )}
      </section>

      {/* ── TRENDING (all time) ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Tendances</h2>
          </div>
          <Link href="/browse?sort=trending">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-all-trending">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {trendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[3/4] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(Array.isArray(trending) ? trending : []).map((manga: any) => (
            
              <SeriesCard key={s.id} {...s} />
            ))}
          </div>
        )}
        {!trendingLoading && (!trending || (trending as any[]).length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune série pour l'instant. Soyez le premier à publier !</p>
          </div>
        )}
      </section>

      {/* ── LATEST UPDATES ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Dernières mises à jour</h2>
          </div>
          <Link href="/browse?sort=latest">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-all-latest">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {updatesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(Array.isArray(latestUpdates) ? latestUpdates : []).map((manga: any) => (
            
              <Link key={u.chapterId} href={`/read/${u.chapterId}`} data-testid={`update-${u.chapterId}`}>
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="w-10 h-14 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {u.seriesCover ? (
                      <img src={u.seriesCover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.seriesTitle}</p>
                      {u.seriesType && (
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TYPE_COLORS[u.seriesType] || "bg-muted text-muted-foreground border-border"}`}>
                          {u.seriesType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Ch. {u.chapterNumber} — {u.chapterTitle}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Date(u.publishedAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── FEATURED AUTHORS (Auteurs à suivre) ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Auteurs à suivre</h2>
          </div>
        </div>
        {authorsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {((Array.isArray(featuredAuthors) && featuredAuthors.length > 0 ? featuredAuthors : (Array.isArray(topAuthors) ? topAuthors : [])) as any[]).map((a: any, rank: number) => (
            
          
            
              <Link key={a.id} href={`/profile/${a.id}`} data-testid={`featured-author-${a.id}`}>
                <div className="relative flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  {/* Rank badge */}
                  <div className={`absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow ${
                    rank === 0 ? "bg-yellow-500 text-black" : rank === 1 ? "bg-zinc-400 text-black" : rank === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {rank + 1}
                  </div>

                  <Avatar className="h-12 w-12 shrink-0">
                    {a.avatar && <AvatarImage src={a.avatar} alt={a.displayName || a.username} />}
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                      {(a.displayName || a.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-semibold truncate">{a.displayName || a.username}</p>
                      {a.verified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                      {a.featured && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-1.5 rounded-full shrink-0">Fondateur</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {a.seriesCount} série{a.seriesCount !== 1 ? "s" : ""} · {a.followersCount} abonné{a.followersCount !== 1 ? "s" : ""}
                    </p>
                    {/* Score stats */}
                    <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground/80">
                      {(a.totalReactions ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-2.5 h-2.5 text-red-400" />{(a.totalReactions).toLocaleString("fr-FR")}
                        </span>
                      )}
                      {(a.totalReads ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <BookOpen className="w-2.5 h-2.5" />{(a.totalReads).toLocaleString("fr-FR")}
                        </span>
                      )}
                      {(a.totalViews ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" />{(a.totalViews).toLocaleString("fr-FR")}
                        </span>
                      )}
                      {(a.score ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 ml-auto text-amber-500/80">
                          <Trophy className="w-2.5 h-2.5" />{a.score.toLocaleString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
