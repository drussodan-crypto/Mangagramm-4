import { useGetReadingHistory } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock } from "lucide-react";

export default function HistoryPage() {
  const { data: history, isLoading } = useGetReadingHistory();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-history">
      <h1 className="text-2xl font-serif font-bold mb-6">Reading History</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (history as any[])?.length ? (
        <div className="space-y-2">
          {(history as any[]).map((h: any) => (
            <Link key={h.id} href={`/read/${h.chapterId}`} data-testid={`history-${h.id}`}>
              <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="w-10 h-14 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {h.seriesCover ? (
                    <img src={h.seriesCover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h.seriesTitle}</p>
                  <p className="text-xs text-muted-foreground">Ch. {h.chapterNumber} - {h.chapterTitle}</p>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(h.readAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No reading history</p>
          <p className="text-sm mt-1">Start reading to see your history here.</p>
        </div>
      )}
    </div>
  );
}
