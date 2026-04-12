import { useGetMyFavorites } from "@workspace/api-client-react";
import { SeriesCard } from "@/components/series-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark } from "lucide-react";

export default function Favorites() {
  const { data: favorites, isLoading } = useGetMyFavorites();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-favorites">
      <h1 className="text-2xl font-serif font-bold mb-6">My Favorites</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : (favorites as any[])?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(favorites as any[]).map((s: any) => (
            <SeriesCard key={s.id} {...s} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No favorites yet</p>
          <p className="text-sm mt-1">Save series you love to find them here.</p>
        </div>
      )}
    </div>
  );
}
