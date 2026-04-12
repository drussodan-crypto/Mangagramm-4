import { useGetTrending, useGetLatestUpdates, useGetTopAuthors, useGetPlatformStats } from "@workspace/api-client-react";
import { SeriesCard } from "@/components/series-card";
import { Link } from "wouter";
import { TrendingUp, Clock, Users, BookOpen, Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: trending, isLoading: trendingLoading } = useGetTrending({ limit: 8 });
  const { data: latestUpdates, isLoading: updatesLoading } = useGetLatestUpdates({ limit: 10 });
  const { data: topAuthors, isLoading: authorsLoading } = useGetTopAuthors({ limit: 6 });
  const { data: stats } = useGetPlatformStats();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12" data-testid="page-home">
      <section className="text-center py-12 space-y-4">
        <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight">MangaGramm</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Discover, read, and publish manga, webtoon, and comics from creators worldwide.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/browse">
            <Button size="lg" data-testid="button-explore">Explore</Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" data-testid="button-start-creating">Start Creating</Button>
          </Link>
        </div>
        {stats && (
          <div className="flex justify-center gap-8 pt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {stats.totalSeries} Series</div>
            <div className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {stats.totalUsers} Users</div>
            <div className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {stats.totalViews?.toLocaleString()} Views</div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Trending</h2>
          </div>
          <Link href="/browse?sort=trending">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-all-trending">
              See all <ArrowRight className="w-4 h-4" />
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
            {(trending as any[])?.map((s: any) => (
              <SeriesCard key={s.id} {...s} />
            ))}
          </div>
        )}
        {!trendingLoading && (!trending || (trending as any[]).length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No series yet. Be the first to publish!</p>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Latest Updates</h2>
          </div>
          <Link href="/browse?sort=latest">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-all-latest">
              See all <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {updatesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(latestUpdates as any[])?.map((u: any) => (
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
                    <p className="text-sm font-medium truncate">{u.seriesTitle}</p>
                    <p className="text-xs text-muted-foreground">Ch. {u.chapterNumber} - {u.chapterTitle}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Date(u.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Top Authors</h2>
          </div>
        </div>
        {authorsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(topAuthors as any[])?.map((a: any) => (
              <Link key={a.id} href={`/profile/${a.id}`} data-testid={`author-${a.id}`}>
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {(a.displayName || a.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.displayName || a.username}</p>
                    <p className="text-xs text-muted-foreground">{a.seriesCount} series / {a.followersCount} followers</p>
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
