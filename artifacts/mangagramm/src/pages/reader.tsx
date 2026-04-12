import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetChapter, useGetChapterComments, useCreateComment, useToggleLike, useCheckLike, useTrackReading, getGetChapterQueryKey, getCheckLikeQueryKey, getGetChapterCommentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Reader() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const cId = parseInt(chapterId || "0", 10);
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const { data: chapter, isLoading } = useGetChapter(cId, {
    query: { enabled: !!cId, queryKey: getGetChapterQueryKey(cId) },
  });

  const { data: comments } = useGetChapterComments(cId, {
    query: { enabled: !!cId && showComments, queryKey: getGetChapterCommentsQueryKey(cId) },
  });

  const { data: likeStatus } = useCheckLike(
    { targetType: "chapter", targetId: cId },
    { query: { enabled: !!cId && isAuthenticated, queryKey: getCheckLikeQueryKey({ targetType: "chapter", targetId: cId }) } }
  );

  const toggleLike = useToggleLike();
  const createComment = useCreateComment();
  const trackReading = useTrackReading();

  useEffect(() => {
    if (cId && isAuthenticated) {
      trackReading.mutate({ chapterId: cId });
    }
  }, [cId, isAuthenticated]);

  const handleLike = () => {
    if (!isAuthenticated) return;
    toggleLike.mutate({ data: { targetType: "chapter", targetId: cId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getCheckLikeQueryKey({ targetType: "chapter", targetId: cId }) });
      },
    });
  };

  const handleComment = () => {
    if (!comment.trim() || !isAuthenticated) return;
    createComment.mutate({ data: { chapterId: cId, content: comment } }, {
      onSuccess: () => {
        setComment("");
        queryClient.invalidateQueries({ queryKey: getGetChapterCommentsQueryKey(cId) });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!chapter) {
    return <div className="text-center py-20 text-muted-foreground">Chapter not found</div>;
  }

  const c = chapter as any;
  const pages = c.pages || [];
  const isLiked = (likeStatus as any)?.liked;

  return (
    <div className={`${fullscreen ? "fixed inset-0 z-50 bg-background overflow-y-auto" : ""}`} data-testid="page-reader">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/series/${c.seriesId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <p className="text-sm font-medium truncate max-w-[200px]">{c.seriesTitle}</p>
              <p className="text-xs text-muted-foreground">Ch. {c.number} - {c.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLike} data-testid="button-like-chapter">
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowComments(!showComments)} data-testid="button-toggle-comments">
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullscreen(!fullscreen)} data-testid="button-fullscreen">
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {pages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No pages in this chapter yet.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {pages.map((p: any) => (
              <div key={p.id} className="flex justify-center">
                <img
                  src={p.imageUrl}
                  alt={`Page ${p.pageNumber}`}
                  className="max-w-full h-auto"
                  loading="lazy"
                  data-testid={`page-${p.pageNumber}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          {c.previousChapterId ? (
            <Button variant="outline" onClick={() => setLocation(`/read/${c.previousChapterId}`)} data-testid="button-prev-chapter">
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
          ) : <div />}
          {c.nextChapterId ? (
            <Button onClick={() => setLocation(`/read/${c.nextChapterId}`)} data-testid="button-next-chapter">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : <div />}
        </div>
      </div>

      {showComments && (
        <div className="max-w-3xl mx-auto px-4 py-6 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">Comments</h3>
          {isAuthenticated && (
            <div className="flex gap-2 mb-6">
              <Textarea
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-comment"
              />
              <Button onClick={handleComment} disabled={!comment.trim()} className="shrink-0" data-testid="button-post-comment">
                Post
              </Button>
            </div>
          )}
          <div className="space-y-4">
            {(comments as any[])?.map((c: any) => (
              <div key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{(c.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.username}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm mt-1">{c.content}</p>
                </div>
              </div>
            ))}
            {(!comments || (comments as any[]).length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
