import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useGetUserSeries, getGetUserSeriesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Heart, BookOpen, Settings, Trash2 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: series, isLoading } = useGetUserSeries(user?.id || 0, {
    query: { enabled: !!user?.id, queryKey: getGetUserSeriesQueryKey(user?.id || 0) },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-dashboard">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold">Author Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your published works</p>
        </div>
        <Link href="/create">
          <Button data-testid="button-create-series">
            <Plus className="w-4 h-4 mr-2" /> New Series
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (series as any[])?.length ? (
        <div className="space-y-3">
          {(series as any[]).map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 p-4 rounded-lg border border-border" data-testid={`dashboard-series-${s.id}`}>
              <div className="w-16 h-20 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {s.coverImage ? (
                  <img src={s.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{s.title}</h3>
                  <Badge variant="secondary" className="text-xs">{s.type}</Badge>
                  <Badge variant={s.status === "ongoing" ? "default" : "secondary"} className="text-xs">{s.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {s.viewCount || 0}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {s.likeCount || 0}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {s.chapterCount || 0} ch.</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/create/${s.id}/chapter`}>
                  <Button size="sm" variant="outline" data-testid={`button-add-chapter-${s.id}`}>
                    <Plus className="w-3 h-3 mr-1" /> Chapter
                  </Button>
                </Link>
                <Link href={`/series/${s.id}`}>
                  <Button size="sm" variant="ghost" data-testid={`button-view-series-${s.id}`}>
                    <Eye className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No series yet</p>
          <p className="text-sm mt-1 mb-4">Start your creative journey by publishing your first series.</p>
          <Link href="/create">
            <Button data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-2" /> Create Your First Series
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
