import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetUserProfile, useGetUserSeries, getGetUserProfileQueryKey, getGetUserSeriesQueryKey } from "@workspace/api-client-react";
import { SeriesCard } from "@/components/series-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, BookOpen, Calendar, Layers, Grid2x2 } from "lucide-react";
import { ClassBadge, XpProgressBar } from "@/components/class-badge";
import { useAuth } from "@/lib/auth-context";

type Tab = "series" | "chapters";

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const uId = parseInt(userId || "0", 10);
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>("series");
  const [chapters, setChapters] = useState<any[] | null>(null);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const { data: profile, isLoading } = useGetUserProfile(uId, {
    query: { enabled: !!uId, queryKey: getGetUserProfileQueryKey(uId) },
  });

  const { data: series } = useGetUserSeries(uId, {
    query: { enabled: !!uId, queryKey: getGetUserSeriesQueryKey(uId) },
  });

  const isOwner = currentUser?.id === uId;

  const loadChapters = async () => {
    if (chapters) return;
    setChaptersLoading(true);
    try {
      const res = await fetch(`/api/users/${uId}/chapters`, { credentials: "include" });
      if (res.ok) setChapters(await res.json());
    } catch { setChapters([]); }
    finally { setChaptersLoading(false); }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "chapters") loadChapters();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-20 text-muted-foreground">Utilisateur introuvable</div>;
  }

  const p = profile as any;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-profile">
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <Avatar className="h-24 w-24">
          <AvatarImage src={p.avatar || ""} />
          <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
            {(p.displayName || p.username || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-3 flex-1">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-serif font-bold">{p.displayName || p.username}</h1>
              <ClassBadge xp={p.xp || 0} size="sm" showDiscount />
            </div>
            <p className="text-sm text-muted-foreground">@{p.username}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{p.role === "author" ? "✍️ Auteur" : p.role === "admin" ? "⚙️ Admin" : "📖 Lecteur"}</Badge>
          </div>
          {p.xp !== undefined && (
            <XpProgressBar xp={p.xp || 0} className="max-w-sm" />
          )}
          {p.bio && <p className="text-sm text-muted-foreground max-w-lg">{p.bio}</p>}
          <div className="flex gap-6 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {p.seriesCount} Séries</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {p.followersCount} Abonnés</span>
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {p.totalViews} Vues</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Inscrit le {new Date(p.createdAt).toLocaleDateString("fr-FR")}
            </p>
            {isOwner && (
              <>
                <Link href="/payouts">
                  <Button variant="outline" size="sm" className="gap-1.5 text-green-500 border-green-500/30 hover:bg-green-500/10">
                    💰 Mes revenus
                  </Button>
                </Link>
                <Link href="/coins">
                  <Button variant="outline" size="sm" className="gap-1.5 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10">
                    🪙 Coins
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        <button
          onClick={() => handleTabChange("series")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "series" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-series"
        >
          <Grid2x2 className="w-4 h-4" /> Séries ({p.seriesCount || 0})
        </button>
        <button
          onClick={() => handleTabChange("chapters")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "chapters" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-chapters"
        >
          <Layers className="w-4 h-4" /> Chapitres
        </button>
      </div>

      {tab === "series" && (
        <div>
          {series && (series as any[]).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(series as any[]).map((s: any) => (
                <SeriesCard key={s.id} {...s} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Aucune série publiée.</p>
          )}
        </div>
      )}

      {tab === "chapters" && (
        <div>
          {chaptersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : chapters && chapters.length > 0 ? (
            <div className="space-y-2">
              {chapters.map((c: any) => (
                <Link key={c.id} href={`/read/${c.id}`} data-testid={`chapter-link-${c.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{c.seriesTitle}</span>
                      <span className="text-sm font-medium">Ch.{c.number}</span>
                      <span className="text-sm truncate">{c.title}</span>
                      {c.isPremium && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-500 border-yellow-500/20">★ Premium</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span><Eye className="w-3 h-3 inline mr-0.5" />{c.viewCount}</span>
                      <span>{c.publishedAt ? new Date(c.publishedAt).toLocaleDateString("fr-FR") : ""}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Aucun chapitre publié.</p>
          )}
        </div>
      )}
    </div>
  );
}
