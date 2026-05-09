import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetChapter, useGetChapterComments, getGetChapterQueryKey, getGetChapterCommentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { ReactionPicker } from "@/components/reaction-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, BookOpen, Lock, LayoutList, Rows, Send } from "lucide-react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [mode, setMode] = useState<"scroll" | "paged">("scroll");
  const [currentPage, setCurrentPage] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [reactionData, setReactionData] = useState<{ total: number; counts: Record<string, number>; myReaction: string | null }>({ total: 0, counts: {}, myReaction: null });

  const { data: chapter, isLoading } = useGetChapter(cId, {
    query: { enabled: !!cId, queryKey: getGetChapterQueryKey(cId) },
  });

  // Comments always loaded — visible to everyone
  const { data: commentsData } = useGetChapterComments(cId, {
    query: { enabled: !!cId, queryKey: getGetChapterCommentsQueryKey(cId) },
  });
  const comments = (commentsData as any[]) || [];

  const c = chapter as any;
  const pages: any[] = c?.pages ? [...c.pages].sort((a: any, b: any) => a.pageNumber - b.pageNumber) : [];
  const isPremium = c?.isPremium;
  const coinPrice = c?.coinPrice || 0;
  const userXp = (user as any)?.xp || 0;
  const userClass = getClassForXp(userXp);
  const discount = isAuthenticated ? (userClass?.discount || 0) : 0;
  const finalPrice = Math.max(1, Math.round(coinPrice * (1 - discount / 100)));

  // Unlock check
  useEffect(() => {
    if (!cId) return;
    if (!isPremium) { setIsUnlocked(true); return; }
    if (!isAuthenticated) { setIsUnlocked(false); return; }
    fetch(`/api/payments/unlocked`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((ids: number[]) => setIsUnlocked(ids.includes(cId)))
      .catch(() => setIsUnlocked(false));
  }, [cId, isAuthenticated, isPremium]);

  // Track reading XP
  useEffect(() => {
    if (cId && isAuthenticated && isUnlocked) {
      fetch("/api/reading-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chapterId: cId }),
      }).catch(() => {});
    }
  }, [cId, isAuthenticated, isUnlocked]);

  // Reactions
  useEffect(() => {
    if (!cId) return;
    fetch(`/api/reactions?targetType=chapter&targetId=${cId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((rd) => { if (rd) setReactionData(rd); })
      .catch(() => {});
  }, [cId]);

  // Keyboard nav in paged mode
  useEffect(() => {
    if (mode !== "paged" || pages.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setCurrentPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, pages.length]);

  // Scroll to top when changing page in paged mode
  useEffect(() => {
    if (mode === "paged") scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, mode]);

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
          toast({ title: "Coins insuffisants", description: `Besoin : ${data.required} coins. Solde : ${data.balance}.`, variant: "destructive" });
          setLocation("/coins");
        } else {
          toast({ title: "Erreur", description: data.error, variant: "destructive" });
        }
        return;
      }
      setIsUnlocked(true);
      toast({ title: "Chapitre débloqué !" });
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
    if (!comment.trim() || !isAuthenticated || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chapterId: cId, content: comment.trim() }),
      });
      if (res.ok) {
        setComment("");
        queryClient.invalidateQueries({ queryKey: getGetChapterCommentsQueryKey(cId) });
      } else {
        toast({ title: "Erreur lors de l'envoi", variant: "destructive" });
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  /* ── LOADING ── */
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-[400px] w-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (!chapter) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Chapitre introuvable</div>;
  }

  const needsUnlock = isPremium && !isUnlocked;

  return (
    /* Full-screen reader — owns its own scroll context */
    <div className="fixed inset-0 bg-black z-[60] flex flex-col" data-testid="page-reader">

      {/* ── TOP BAR ── */}
      <div className="shrink-0 h-12 border-b border-white/10 bg-black/95 backdrop-blur flex items-center gap-2 px-3 z-10">
        <Link href={`/series/${c.seriesId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-white hover:bg-white/10" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-xs font-medium truncate text-white">{c.seriesTitle}</p>
          <p className="text-[11px] text-gray-400 truncate">
            Ch.{c.number} — {c.title}
            {isPremium && <span className="ml-1 text-yellow-400">★ Premium</span>}
          </p>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {pages.length > 0 && isUnlocked && (
            <span className="text-[11px] text-gray-400 px-2 tabular-nums hidden sm:block">
              {mode === "paged" ? `${currentPage + 1}/${pages.length}` : `${pages.length} page${pages.length > 1 ? "s" : ""}`}
            </span>
          )}

          {/* Mode toggle */}
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10"
            onClick={() => { setMode(m => m === "scroll" ? "paged" : "scroll"); setCurrentPage(0); }}
            title={mode === "scroll" ? "Passer en mode page par page" : "Passer en mode défilement"}
          >
            {mode === "scroll" ? <Rows className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
          </Button>

          <ReactionPicker targetType="chapter" targetId={cId} total={reactionData.total} myReaction={reactionData.myReaction} counts={reactionData.counts} onReact={handleReact} compact />
        </div>
      </div>

      {/* ── SCROLL AREA ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* PREMIUM GATE */}
        {needsUnlock ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] py-16 px-4 text-center">
            <Lock className="w-16 h-16 mb-4 text-yellow-400" />
            <h3 className="text-xl font-bold text-white mb-2">Chapitre Premium</h3>
            <p className="text-gray-400 mb-2">Prix : <span className="text-yellow-400 font-bold">{coinPrice} Coins</span></p>
            {discount > 0 && (
              <p className="text-green-400 text-sm mb-4">✨ Réduction classe {discount}% → <strong>{finalPrice} Coins</strong></p>
            )}
            {pages[0]?.imageUrl && (
              <div className="relative max-w-xs mb-6 rounded-lg overflow-hidden mx-auto">
                <img src={pages[0].imageUrl} alt="Aperçu" className="w-full opacity-20 blur-sm select-none" draggable={false} />
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
                  {isUnlocking ? "Déblocage…" : `Débloquer — ${finalPrice} Coins`}
                </Button>
              )}
              <Button onClick={() => setLocation("/coins")} variant="outline" size="lg" className="gap-2 border-white/20 text-white hover:bg-white/10">
                Acheter des Coins
              </Button>
            </div>
          </div>

        /* NO PAGES */
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
            <BookOpen className="w-14 h-14 mb-3 opacity-20" />
            <p className="text-sm">Aucune page dans ce chapitre.</p>
          </div>

        /* ── SCROLL MODE — all pages stacked vertically ── */
        ) : mode === "scroll" ? (
          <div className="w-full">
            {pages.map((p: any, i: number) => (
              <div key={p.id ?? i} className="w-full" data-testid={`page-${p.pageNumber}`}>
                <img
                  src={p.imageUrl}
                  alt={`Page ${p.pageNumber}`}
                  className="w-full max-w-2xl mx-auto block"
                  style={{ height: "auto" }}
                  loading={i < 3 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            ))}

            {/* Chapter navigation at bottom */}
            <div className="flex justify-between items-center gap-3 px-4 py-8 max-w-2xl mx-auto">
              {c.previousChapterId ? (
                <Button
                  variant="outline"
                  onClick={() => { setCurrentPage(0); setLocation(`/read/${c.previousChapterId}`); }}
                  className="gap-1 border-white/20 text-white hover:bg-white/10"
                  data-testid="button-prev-chapter"
                >
                  <ChevronLeft className="w-4 h-4" /> Chapitre précédent
                </Button>
              ) : <div />}
              {c.nextChapterId ? (
                <Button
                  onClick={() => { setCurrentPage(0); setLocation(`/read/${c.nextChapterId}`); }}
                  className="gap-1 bg-white text-black hover:bg-gray-200 font-semibold"
                  data-testid="button-next-chapter"
                >
                  Chapitre suivant <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="text-sm text-gray-500 text-right">
                  Fin de la série disponible.<br />Revenez bientôt !
                </div>
              )}
            </div>
          </div>

        /* ── PAGED MODE — one page at a time ── */
        ) : (
          <div className="flex flex-col min-h-full">
            <div className="relative flex-1 flex justify-center items-start">
              {pages[currentPage] && (
                <img
                  src={pages[currentPage].imageUrl}
                  alt={`Page ${pages[currentPage].pageNumber}`}
                  className="max-w-2xl w-full block"
                  style={{ minHeight: "50vh", objectFit: "contain" }}
                  data-testid={`page-${pages[currentPage].pageNumber}`}
                />
              )}
              {/* Tap zones */}
              <button
                className="absolute left-0 top-0 h-full w-1/3 z-10 cursor-w-resize"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                aria-label="Page précédente"
              />
              <button
                className="absolute right-0 top-0 h-full w-1/3 z-10 cursor-e-resize"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pages.length - 1))}
                aria-label="Page suivante"
              />
            </div>

            {/* Bottom nav bar */}
            <div className="sticky bottom-0 w-full flex items-center justify-between gap-2 px-3 py-2 bg-black/90 backdrop-blur border-t border-white/10">
              <Button
                variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 shrink-0"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              {/* Dot progress */}
              <div className="flex gap-1 overflow-hidden flex-1 justify-center items-center">
                {pages.length <= 20 ? pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`rounded-full transition-all shrink-0 ${i === currentPage ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"}`}
                  />
                )) : (
                  <span className="text-sm text-gray-300 font-mono">
                    {currentPage + 1} / {pages.length}
                  </span>
                )}
              </div>

              <Button
                variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 shrink-0"
                disabled={currentPage === pages.length - 1}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pages.length - 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Chapter navigation */}
            <div className="flex justify-between items-center gap-3 px-4 py-6 max-w-2xl mx-auto w-full">
              {c.previousChapterId ? (
                <Button
                  variant="outline"
                  onClick={() => { setCurrentPage(0); setLocation(`/read/${c.previousChapterId}`); }}
                  className="gap-1 border-white/20 text-white hover:bg-white/10"
                  data-testid="button-prev-chapter"
                >
                  <ChevronLeft className="w-4 h-4" /> Chapitre précédent
                </Button>
              ) : <div />}
              {c.nextChapterId ? (
                <Button
                  onClick={() => { setCurrentPage(0); setLocation(`/read/${c.nextChapterId}`); }}
                  className="gap-1 bg-white text-black hover:bg-gray-200 font-semibold"
                  data-testid="button-next-chapter"
                >
                  Chapitre suivant <ChevronRight className="w-4 h-4" />
                </Button>
              ) : <div />}
            </div>
          </div>
        )}

        {/* ── COMMENTS — toujours visibles, post nécessite connexion ── */}
        {!needsUnlock && (
          <div className="border-t border-white/10 px-4 pt-6 pb-10 max-w-2xl mx-auto w-full">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4" />
              Commentaires
              {comments.length > 0 && (
                <span className="text-sm font-normal text-gray-400">({comments.length})</span>
              )}
            </h3>

            {/* Post form */}
            {isAuthenticated ? (
              <div className="flex gap-2 mb-6">
                <Textarea
                  placeholder="Écrire un commentaire…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleComment(); }}
                  className="min-h-[60px] bg-zinc-900 border-white/10 text-white resize-none text-sm"
                  data-testid="textarea-comment"
                />
                <Button
                  onClick={handleComment}
                  disabled={!comment.trim() || submittingComment}
                  size="icon"
                  className="h-10 w-10 shrink-0 self-end"
                  data-testid="button-post-comment"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Connectez-vous pour commenter</p>
                <Button
                  size="sm"
                  onClick={() => setLocation("/login")}
                  className="shrink-0"
                >
                  Se connecter
                </Button>
              </div>
            )}

            {/* Comments list */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-6">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm text-gray-500">Soyez le premier à commenter !</p>
                </div>
              ) : (
                comments.map((cm: any) => (
                  <div key={cm.id} className="flex gap-3" data-testid={`comment-${cm.id}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-zinc-800 text-white">
                        {(cm.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-white">{cm.username}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(cm.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 break-words leading-relaxed">{cm.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
