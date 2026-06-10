import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetChapter, useGetChapterComments, getGetChapterQueryKey, getGetChapterCommentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { ReactionPicker } from "@/components/reaction-picker";
import { AdBanner } from "@/components/ad-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, BookOpen, Lock,
  LayoutList, Rows, Send, Heart, Reply, Pencil, Trash2, Image as ImageIcon, X, Check,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getClassForXp } from "@/components/class-badge";
import { useToast } from "@/hooks/use-toast";
import { ProfileAvatar } from "@/components/profile-avatar";
import { cn } from "@/lib/utils";

/* ─── Per-page reaction constants ───────────────────────────── */
const EMOJIS = [
  { type: "like",  emoji: "👍" },
  { type: "love",  emoji: "❤️" },
  { type: "haha",  emoji: "😂" },
  { type: "wow",   emoji: "😮" },
  { type: "sad",   emoji: "😢" },
  { type: "angry", emoji: "😡" },
] as const;

type PageReactionMap = Record<number, { counts: Record<string, number>; myReaction: string | null; total: number }>;

/* ─── PageReactionBar ─────────────────────────────────────────
   Barre de réactions style Facebook sous chaque page du chapitre.
   Affiche les 3 emojis les plus populaires + compteur à gauche,
   et les 6 boutons de réaction à droite (toujours visibles).
──────────────────────────────────────────────────────────────── */
function PageReactionBar({
  pageId,
  reactions,
  onReact,
}: {
  pageId: number;
  reactions?: PageReactionMap[number];
  onReact: (pageId: number, type: string) => void;
}) {
  const counts = reactions?.counts ?? {};
  const myReaction = reactions?.myReaction ?? null;
  const total = reactions?.total ?? 0;

  const topEmojis = [...EMOJIS]
    .filter((e) => (counts[e.type] ?? 0) > 0)
    .sort((a, b) => (counts[b.type] ?? 0) - (counts[a.type] ?? 0))
    .slice(0, 3);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 border-t border-white/5">
      {/* Left: top emojis + count */}
      <div className="flex items-center gap-1.5 min-w-0">
        {topEmojis.length > 0 && (
          <span className="flex -space-x-0.5">
            {topEmojis.map((e) => (
              <span key={e.type} className="text-base leading-none">{e.emoji}</span>
            ))}
          </span>
        )}
        {total > 0 && (
          <span className="text-xs text-gray-400 tabular-nums">{total}</span>
        )}
        {total === 0 && (
          <span className="text-[11px] text-gray-600 italic">Réagir à cette page</span>
        )}
      </div>

      {/* Right: 6 reaction buttons */}
      <div className="flex items-center gap-0.5">
        {EMOJIS.map((e) => (
          <button
            key={e.type}
            onClick={() => onReact(pageId, e.type)}
            className={cn(
              "text-base leading-none p-1 rounded transition-all duration-100 active:scale-125 select-none",
              myReaction === e.type
                ? "scale-110 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                : "opacity-70 hover:opacity-100 hover:scale-110"
            )}
            title={e.type}
            aria-label={e.type}
          >
            {e.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Reader ─────────────────────────────────────────────────── */
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

  // Chapter-level reactions
  const [reactionData, setReactionData] = useState<{
    total: number; counts: Record<string, number>; myReaction: string | null;
  }>({ total: 0, counts: {}, myReaction: null });

  // Per-page reactions: pageId → {counts, myReaction, total}
  const [pageReactions, setPageReactions] = useState<PageReactionMap>({});

  const { data: chapter, isLoading } = useGetChapter(cId, {
    query: { enabled: !!cId, queryKey: getGetChapterQueryKey(cId) },
  });

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

  // Chapter-level reactions
  useEffect(() => {
    if (!cId) return;
    fetch(`/api/reactions?targetType=chapter&targetId=${cId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((rd) => { if (rd) setReactionData(rd); })
      .catch(() => {});
  }, [cId]);

  // Per-page reactions — batch load in one request
  useEffect(() => {
    if (!cId || !isUnlocked || pages.length === 0) return;
    fetch(`/api/reactions/page-reactions?chapterId=${cId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : {})
      .then((data: PageReactionMap) => setPageReactions(data))
      .catch(() => {});
  }, [cId, isUnlocked, pages.length]);

  // Keyboard nav in paged mode
  useEffect(() => {
    if (mode !== "paged" || pages.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   setCurrentPage((p) => Math.max(p - 1, 0));
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

  // Chapter-level reaction
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

  // Per-page reaction with optimistic update
  const handlePageReact = useCallback(async (pageId: number, reactionType: string) => {
    if (!isAuthenticated) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour réagir aux pages." });
      return;
    }

    // Optimistic update
    setPageReactions((prev) => {
      const current = prev[pageId] ?? { counts: {}, myReaction: null, total: 0 };
      const wasMine = current.myReaction === reactionType;
      const prevMine = current.myReaction;
      const newCounts = { ...current.counts };

      // Remove previous reaction if switching
      if (prevMine) newCounts[prevMine] = Math.max(0, (newCounts[prevMine] ?? 0) - 1);
      // Add new reaction unless toggling same one off
      if (!wasMine) newCounts[reactionType] = (newCounts[reactionType] ?? 0) + 1;

      const newTotal = Object.values(newCounts).reduce((s, v) => s + v, 0);
      return {
        ...prev,
        [pageId]: { counts: newCounts, myReaction: wasMine ? null : reactionType, total: newTotal },
      };
    });

    // Server sync
    const res = await fetch("/api/reactions/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetType: "page", targetId: pageId, reactionType }),
    });
    if (res.ok) {
      const data = await res.json();
      setPageReactions((prev) => ({
        ...prev,
        [pageId]: { counts: data.counts, myReaction: data.myReaction, total: data.total },
      }));
    }
  }, [isAuthenticated, toast]);

  const [commentImageUrl, setCommentImageUrl] = useState<string | null>(null);
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: number; content: string } | null>(null);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [likeDeltas, setLikeDeltas] = useState<Map<number, number>>(new Map());
  const commentFileRef = useRef<HTMLInputElement>(null);

  // Load initial liked state from DB
  useEffect(() => {
    if (!cId || !isAuthenticated) return;
    fetch(`/api/likes/my-comment-likes?chapterId=${cId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((ids: number[]) => setLikedComments(new Set(ids)))
      .catch(() => {});
  }, [cId, isAuthenticated]);

  const uploadCommentImage = async (file: File) => {
    setUploadingCommentImage(true);
    try {
      const meta = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!meta.ok) throw new Error();
      const { uploadURL, objectPath } = await meta.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setCommentImageUrl(`/api/storage${objectPath}`);
    } catch { toast({ title: "Erreur d'upload", variant: "destructive" }); }
    finally { setUploadingCommentImage(false); }
  };

  const handleComment = async () => {
    if ((!comment.trim() && !commentImageUrl) || !isAuthenticated || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chapterId: cId, content: comment.trim() || " ", imageUrl: commentImageUrl || undefined, parentId: replyTo?.id || undefined }),
      });
      if (res.ok) {
        setComment("");
        setCommentImageUrl(null);
        setReplyTo(null);
        queryClient.invalidateQueries({ queryKey: getGetChapterCommentsQueryKey(cId) });
      } else {
        toast({ title: "Erreur lors de l'envoi", variant: "destructive" });
      }
    } finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId: number) => {
    await fetch(`/api/comments/${commentId}`, { method: "DELETE", credentials: "include" });
    queryClient.invalidateQueries({ queryKey: getGetChapterCommentsQueryKey(cId) });
  };

  const handleEditComment = async (commentId: number, content: string) => {
    await fetch(`/api/comments/${commentId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ content }),
    });
    setEditingComment(null);
    queryClient.invalidateQueries({ queryKey: getGetChapterCommentsQueryKey(cId) });
  };

  const handleLikeComment = async (commentId: number) => {
    if (!isAuthenticated) { toast({ title: "Connexion requise" }); return; }
    const wasLiked = likedComments.has(commentId);
    // Optimistic update
    setLikedComments(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    setLikeDeltas(prev => {
      const next = new Map(prev);
      next.set(commentId, (next.get(commentId) || 0) + (wasLiked ? -1 : 1));
      return next;
    });
    const res = await fetch("/api/likes/toggle", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ targetType: "comment", targetId: commentId }),
    });
    if (res.ok) {
      setLikeDeltas(prev => {
        const next = new Map(prev);
        next.delete(commentId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: getGetChapterCommentsQueryKey(cId) });
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
            title={mode === "scroll" ? "Mode page par page" : "Mode défilement"}
          >
            {mode === "scroll" ? <Rows className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
          </Button>

          <ReactionPicker
            targetType="chapter" targetId={cId}
            total={reactionData.total} myReaction={reactionData.myReaction} counts={reactionData.counts}
            onReact={handleReact} compact
          />
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

        /* ── SCROLL MODE — Facebook style: chaque page = une carte avec réactions ── */
        ) : mode === "scroll" ? (
          <div className="w-full">
            {pages.map((p: any, i: number) => (
              <>
                <div
                  key={p.id ?? i}
                  className="w-full max-w-2xl mx-auto mb-2 last:mb-0"
                  data-testid={`page-${p.pageNumber}`}
                >
                  {/* Page image — full width, no gap between image and bar */}
                  <img
                    src={p.imageUrl}
                    alt={`Page ${p.pageNumber}`}
                    className="w-full block"
                    style={{ height: "auto" }}
                    loading={i < 3 ? "eager" : "lazy"}
                    decoding="async"
                  />

                  {/* ── Reaction bar — collée sous l'image comme Facebook ── */}
                  <PageReactionBar
                    pageId={p.id}
                    reactions={pageReactions[p.id]}
                    onReact={handlePageReact}
                  />
                </div>

                {/* ── Pub toutes les 5 pages, uniquement sur chapitres gratuits ── */}
                {!isPremium && (i + 1) % 5 === 0 && i < pages.length - 1 && (
                  <AdBanner key={`ad-${i}`} slot="between-pages" />
                )}
              </>
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
                <>
                  <img
                    src={pages[currentPage].imageUrl}
                    alt={`Page ${pages[currentPage].pageNumber}`}
                    className="max-w-2xl w-full block"
                    style={{ minHeight: "50vh", objectFit: "contain" }}
                    data-testid={`page-${pages[currentPage].pageNumber}`}
                  />
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
                </>
              )}
            </div>

            {/* Reaction bar in paged mode too */}
            {pages[currentPage] && (
              <div className="max-w-2xl w-full mx-auto">
                <PageReactionBar
                  pageId={pages[currentPage].id}
                  reactions={pageReactions[pages[currentPage].id]}
                  onReact={handlePageReact}
                />
              </div>
            )}

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
              <div className="mb-6">
                {replyTo && (
                  <div className="flex items-center justify-between text-xs text-gray-400 bg-white/5 rounded-t px-3 py-1.5 border border-white/10 border-b-0">
                    <span>Réponse à <strong className="text-white">@{replyTo.username}</strong></span>
                    <button onClick={() => setReplyTo(null)} className="hover:text-white"><X className="w-3 h-3" /></button>
                  </div>
                )}
                {commentImageUrl && (
                  <div className="relative inline-block mb-2">
                    <img src={commentImageUrl} alt="Aperçu" className="max-h-24 rounded" />
                    <button
                      onClick={() => setCommentImageUrl(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    placeholder={replyTo ? `Répondre à @${replyTo.username}…` : "Écrire un commentaire…"}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleComment(); }}
                    className={cn("min-h-[60px] bg-zinc-900 border-white/10 text-white resize-none text-sm", replyTo && "rounded-t-none")}
                    data-testid="textarea-comment"
                  />
                  <div className="flex flex-col gap-1 self-end">
                    <Button
                      variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10"
                      onClick={() => commentFileRef.current?.click()}
                      disabled={uploadingCommentImage}
                      title="Joindre une image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleComment}
                      disabled={(!comment.trim() && !commentImageUrl) || submittingComment}
                      size="icon" className="h-9 w-9 shrink-0"
                      data-testid="button-post-comment"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <input ref={commentFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCommentImage(f); e.target.value = ""; }} />
              </div>
            ) : (
              <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Connectez-vous pour commenter</p>
                <Button size="sm" onClick={() => setLocation("/login")} className="shrink-0">Se connecter</Button>
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
                comments.map((cm: any) => {
                  const isOwn = user?.id === cm.userId;
                  const liked = likedComments.has(cm.id);
                  const isEditing = editingComment?.id === cm.id;
                  return (
                    <div key={cm.id} className={cn("flex gap-3", cm.parentId && "ml-8 pl-3 border-l border-white/10")} data-testid={`comment-${cm.id}`}>
                      <ProfileAvatar src={cm.userAvatar} name={cm.username} xp={cm.userXp || 0} size="sm" showBadge className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium text-white">{cm.username}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(cm.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            {cm.editedAt && <span className="ml-1 italic">(modifié)</span>}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex gap-1 mt-1">
                            <Textarea
                              value={editingComment.content}
                              onChange={e => setEditingComment({ id: cm.id, content: e.target.value })}
                              className="min-h-[50px] bg-zinc-800 border-white/10 text-white resize-none text-sm py-1"
                              autoFocus
                            />
                            <div className="flex flex-col gap-1">
                              <Button size="icon" className="h-8 w-8" onClick={() => handleEditComment(cm.id, editingComment.content)}><Check className="w-3 h-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400" onClick={() => setEditingComment(null)}><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {cm.imageUrl && <img src={cm.imageUrl} alt="Image" className="rounded max-w-[200px] mt-1 mb-1" />}
                            <p className="text-sm text-gray-300 break-words leading-relaxed">{cm.content?.trim()}</p>
                          </>
                        )}

                        {/* Comment actions */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            onClick={() => handleLikeComment(cm.id)}
                            className={cn("flex items-center gap-1 text-xs transition-colors", liked ? "text-red-400" : "text-gray-500 hover:text-red-400")}
                          >
                            <Heart className={cn("w-3.5 h-3.5", liked && "fill-current")} />
                            <span>{Math.max(0, (cm.likeCount || 0) + (likeDeltas.get(cm.id) || 0))}</span>
                          </button>
                          {isAuthenticated && !cm.parentId && (
                            <button
                              onClick={() => setReplyTo({ id: cm.id, username: cm.username })}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                            >
                              <Reply className="w-3.5 h-3.5" /> Répondre
                            </button>
                          )}
                          {isOwn && !isEditing && (
                            <>
                              <button onClick={() => setEditingComment({ id: cm.id, content: cm.content })} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteComment(cm.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
