import { useParams } from "wouter";
import { useGetUserProfile, useGetUserSeries, getGetUserProfileQueryKey, getGetUserSeriesQueryKey } from "@workspace/api-client-react";
import { SeriesCard } from "@/components/series-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, BookOpen, Calendar } from "lucide-react";

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const uId = parseInt(userId || "0", 10);

  const { data: profile, isLoading } = useGetUserProfile(uId, {
    query: { enabled: !!uId, queryKey: getGetUserProfileQueryKey(uId) },
  });

  const { data: series } = useGetUserSeries(uId, {
    query: { enabled: !!uId, queryKey: getGetUserSeriesQueryKey(uId) },
  });

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
    return <div className="text-center py-20 text-muted-foreground">User not found</div>;
  }

  const p = profile as any;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-profile">
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
            {(p.displayName || p.username || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-serif font-bold">{p.displayName || p.username}</h1>
            <p className="text-sm text-muted-foreground">@{p.username}</p>
          </div>
          <Badge variant="secondary">{p.role}</Badge>
          {p.bio && <p className="text-sm text-muted-foreground max-w-lg">{p.bio}</p>}
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {p.seriesCount} Series</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {p.followersCount} Followers</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {p.followingCount} Following</span>
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {p.totalViews} Views</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Joined {new Date(p.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Series</h2>
        {series && (series as any[]).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(series as any[]).map((s: any) => (
              <SeriesCard key={s.id} {...s} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">No series published yet.</p>
        )}
      </div>
    </div>
  );
}
