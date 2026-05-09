import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetChapter, useGetChapterComments, getGetChapterQueryKey, getGetChapterCommentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { ReactionPicker } from "@/components/reaction-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, Maximize2, Minimize2, BookOpen, Lock, LayoutList, Rows } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getClassForXp } from "@/components/class-badge";
import { useToast } from "@/hooks/use-toast";

export default function Reader() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const cId = parseInt(chapterId || "0", 10);
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [comment, setComment] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [mode, setMode] = useState<"scroll" | "paged">("scroll");
  const [currentPage, setCurrentPage] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [reactionData, setReactionData] = useState<{ total: number; counts: Record<string, number>; myReaction: string | null }>({ total: 0, counts: {}, myReaction: null });
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data: chapter, isLoading } = useGetChapter(cId, {
    query: { enabled: !!cId, queryKey: getGetChapterQueryKey(cId) },
  });

  const { data: comments } = useGetChapterComments(cId, {
    query: { enabled: !!cId && showComments, queryKey: getGetChapterCommentsQueryKey(cId) },
  });

  const c = chapter as any;
  const pages: any[] = c?.pages ? [...c.pages].sort((a: any, b: any) => a.pageNumber - b.pageNumber) : [];
  const isPremium = c?.isPremium;
  const coinPrice = c?.coinPrice || 0;
  const userXp = (user as any)?.xp || 0;
  const userClass = getClassForXp(userXp);
  const discount = isAuthenticated ? (userClass?.discount || 0) : 0;
  const finalPrice = Math.max(1, Math.round(coinPrice * (1 - discount / 100)));

  useEffect(() => {
    if (!cId) return;
    if (!isPremium) { setIsUnlocked(true); return; }
    if (!isAuthenticated) { setIsUnlocked(false); return; }
    fetch(`/api/payments/unlocked`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((ids: number[]) => setIsUnlocked(ids.includes(cId)))
      .catch(() => setIsUnlocked(false));
  }, [cId, isAuthenticated, isPremium]);

  useEffect(() => {
    if (cId && isAuthenticated && isUnlocked) {
      fetch(`/api/reading-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chapterId: cId }),
      }).catch(() => {});
    }
  }, [cId, isAuthenticated, isUnlocked]);

  useEffect(() => {
    if (!cId) return;
    fetch(`/api/reactions?targetType=chapter&targetId=${cId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((rd) => { if (rd) setReactionData(rd); })
      .catch(() => {});
  }, [cId]);

  const handleUnlock = async () => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    setIsUnlocking(true);
    try {
      const res = await fetch("/api/payments/unlock-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chapterId: cId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_coins") {
          toast({ title: "Coins insuffisants", description: `Besoin: ${data.required} coins. Solde: ${data.balance}.`, variant: "destructive" });
          setLocation("/coins");
        } else {
          toast({ title: "Erreur", description: data.error, variant: "destructive" });
        }
        return;
      }
      setIsUnlocked(true);
      toast({ title: "Chapitre débloqué !", description: `${data.coinsSpent} coins${discount > 0 ? ` (${discount}% de réduction)` : ""}.` });
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleReact = useCallback(async (reactionType: string) => {
    const res = await fetch("/api/reactions/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetType: "chapter", targetId: cId, reactionType }),
    });
    if (res.ok) {
      const data = await res.json();
      setReactionData({ total: data.total, counts: data.counts, myReaction: data.myReaction });
    }
  }, [cId]);

  const handleComment = async () => {
    if (!comment.trim() || !isAuthenticated) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ chapterId: cId, content: comment }),
    });
    if (res.ok) {
      setComment("");
      queryClient.invalidateQueries({ queryKey: getGetChapterCommentsQueryKey(cId) });
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mode !== "paged" || pages.length === 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setCurrentPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, pages.length]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!chapter) return <div className="text-center py-20 text-muted-foreground">Chapitre introuvable</div>;

  const needsUnlock = isPremium && !isUnlocked;

  return (
    <div className={`${fullscreen ? "fixed inset-0 z-50 bg-black overflow-y-auto" : "bg-black min-h-[calc(100vh-4rem)]"}`} data-testid="page-reader">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/series/${c.seriesId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-white hover:bg-white/10" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate max-w-[160px] sm:max-w-[260px] text-white">{c.seriesTitle}</p>
              <p className="text-xs text-gray-400">
                Ch.{c.number} — {c.title}
                {isPremium && <span className="ml-1 text-yellow-400">★ Premium</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {pages.length > 0 && isUnlocked && (
              <span className="text-xs text-gray-400 hidden sm:inline px-2">
                {mode === "paged" ? `${currentPage + 1}/${pages.length}` : `${pages.length}p`}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => setMode(m => m === "scroll" ? "paged" : "scroll")} title={mode === "scroll" ? "Mode page" : "Mode scroll"}>
              {mode === "scroll" ? <Rows className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
            </Button>
            <ReactionPicker targetType="chapter" targetId={cId} total={reactionData.total} myReaction={reactionData.myReaction} counts={reactionData.counts} onReact={handleReact} compact />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => setShowComments(!showComments)} data-testid="button-toggle-comments">
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => setFullscreen(!fullscreen)} data-testid="button-fullscreen">
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {needsUnlock ? (
          <div className="text-center py-16 px-4">
            <Lock className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-xl font-bold text-white mb-2">Chapitre Premium</h3>
            <p className="text-gray-400 mb-2">Prix : <span className="text-yellow-400 font-bold">{coinPrice} Coins</span></p>
            {discount > 0 && (
              <p className="text-green-400 text-sm mb-4">✨ Réduction de classe : {discount}% → <strong>{finalPrice} Coins</strong></p>
            )}
            {pages[0]?.imageUrl && (
              <div className="relative max-w-xs mx-auto mb-6 rounded-lg overflow-hidden">
                <img src={pages[0].imageUrl} alt="Aperçu" className="w-full opacity-20 blur-md" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
                <Lock className="absolute inset-0 m-auto w-10 h-10 text-yellow-400" />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isAuthenticated ? (
                <Button onClick={() => setLocation("/login")} size="lg" className="gap-2 bg-white text-black hover:bg-gray-100">
                  <Lock className="w-4 h-4" /> Connexion requise
                </Button>
              ) : (
                <Button onClick={handleUnlock} size="lg" disabled={isUnlocking} className="gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold" data-testid="button-unlock">
                  {isUnlocking ? "Déblocage..." : `Débloquer — ${finalPrice} Coins`}
                </Button>
              )}
              <Button onClick={() => setLocation("/coins")} variant="outline" size="lg" className="gap-2 border-white/20 text-white hover:bg-white/10">
                Acheter des Coins
              </Button>
            </div>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucune page dans ce chapitre.</p>
          </div>
        ) : mode === "scroll" ? (
          <div>
            {pages.map((p: any, i: number) => (
              <div
                key={p.id ?? i}
                ref={(el) => { pageRefs.current[i] = el; }}
                className="flex justify-center"
                data-testid={`page-${p.pageNumber}`}
              >
                <img
                  src={p.imageUrl}
                  alt={`Page ${p.pageNumber}`}
                  className="max-w-full w-full h-auto block"
                  loading={i < 3 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center relative">
            {pages[currentPage] && (
              <div className="relative w-full flex justify-center select-none">
                <img
                  src={pages[currentPage].imageUrl}
                  alt={`Page ${pages[currentPage].pageNumber}`}
                  className="max-w-full max-h-[85vh] w-auto object-contain"
                  data-testid={`page-${pages[currentPage].pageNumber}`}
                />
                <button
                  className="absolute left-0 top-0 h-full w-2/5 opacity-0 cursor-w-resize z-10"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                  aria-label="Page précédente"
                />
                <button
                  className="absolute right-0 top-0 h-full w-2/5 opacity-0 cursor-e-resize z-10"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, pages.length - 1))}
                  aria-label="Page suivante"
                />
              </div>
            )}
            <div className="flex items-center gap-4 py-3 w-full justify-center bg-black/60 sticky bottom-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm text-gray-300 font-mono">{currentPage + 1} / {pages.length}</span>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10" disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage((p) => Math.min(p + 1, pages.length - 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {!needsUnlock && pages.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 py-4 border-t border-white/10">
          <div className="flex justify-between items-center">
            {c.previousChapterId ? (
              <Button variant="outline" onClick={() => setLocation(`/read/${c.previousChapterId}`)} className="gap-1 border-white/20 text-white hover:bg-white/10" data-testid="button-prev-chapter">
                <ChevronLeft className="w-4 h-4" /> Précédent
              </Button>
            ) : <div />}
            {c.nextChapterId ? (
              <Button onClick={() => setLocation(`/read/${c.nextChapterId}`)} className="gap-1" data-testid="button-next-chapter">
                Suivant <ChevronRight className="w-4 h-4" />
              </Button>
            ) : <div />}
          </div>
        </div>
      )}

      {showComments && (
        <div className="max-w-3xl mx-auto px-4 py-6 border-t border-white/10 bg-zinc-950">
          <h3 className="text-lg font-semibold mb-4 text-white">Commentaires</h3>
          {isAuthenticated && (
            <div className="flex gap-2 mb-6">
              <Textarea placeholder="Écrire un commentaire..." value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[80px] bg-zinc-900 border-white/10 text-white" data-testid="textarea-comment" />
              <Button onClick={handleComment} disabled={!comment.trim()} className="shrink-0" data-testid="button-post-comment">Poster</Button>
            </div>
          )}
          <div className="space-y-4">
            {(comments as any[])?.map((cm: any) => (
              <div key={cm.id} className="flex gap-3" data-testid={`comment-${cm.id}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-zinc-700 text-white">{(cm.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{cm.username}</span>
                    <span className="text-xs text-gray-500">{new Date(cm.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <p className="text-sm mt-1 text-gray-300">{cm.content}</p>
                </div>
              </div>
            ))}
            {(!comments || (comments as any[]).length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">Aucun commentaire.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
