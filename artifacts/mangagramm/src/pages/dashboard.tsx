import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useGetUserSeries, getGetUserSeriesQueryKey } from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { ClassBadge, XpProgressBar } from "@/components/class-badge";
import { MultiPageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Heart, BookOpen, PenTool, Trash2, Lock, Coins, Upload, ChevronDown, ChevronUp } from "lucide-react";

/* ─── Chapter Manager Dialog ─────────────────────────────────── */
function ChapterManager({ series, onClose }: { series: any; onClose: () => void }) {
  const [chapters, setChapters] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editChapter, setEditChapter] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPremium, setEditPremium] = useState(false);
  const [editPrice, setEditPrice] = useState("5");
  const [editPages, setEditPages] = useState<{ url: string; preview?: string }[]>([]);
  const [showPages, setShowPages] = useState(false);
  const [savingPages, setSavingPages] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { toast } = useToast();

  const loadChapters = async () => {
    try {
      const res = await fetch(`/api/series/${series.id}/chapters`, { credentials: "include" });
      if (res.ok) setChapters(await res.json());
    } finally {
      setLoading(false);
    }
  };

  if (chapters === null && loading) { loadChapters(); }

  const handleEdit = async (c: any) => {
    setEditChapter(c);
    setEditTitle(c.title);
    setEditPremium(c.isPremium || false);
    setEditPrice(String(c.coinPrice || 5));
    setShowPages(false);
    // Load existing pages for this chapter
    try {
      const res = await fetch(`/api/chapters/${c.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const existingPages = (data.pages || []).map((p: any) => ({ url: p.imageUrl, preview: p.imageUrl }));
        setEditPages(existingPages);
      }
    } catch {}
  };

  const handleSaveTitle = async () => {
    if (!editChapter) return;
    const res = await fetch(`/api/chapters/${editChapter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: editTitle,
        isPremium: editPremium,
        coinPrice: editPremium ? (parseInt(editPrice) || 5) : 0,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setChapters((prev) => prev?.map((c) => c.id === updated.id ? { ...c, ...updated } : c) ?? null);
      toast({ title: "Chapitre mis à jour ✓" });
    } else {
      toast({ title: "Erreur de mise à jour", variant: "destructive" });
    }
  };

  const handleSavePages = async () => {
    if (!editChapter) return;
    const validPages = editPages.filter((p) => p.url.trim());
    if (validPages.length === 0) {
      toast({ title: "Aucune page valide à enregistrer", variant: "destructive" });
      return;
    }
    setSavingPages(true);
    try {
      // Replace all pages: delete existing then re-add
      // First: delete existing pages via a replace endpoint (post new pages, API will append)
      const res = await fetch(`/api/chapters/${editChapter.id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pages: validPages.map((p, i) => ({ pageNumber: i + 1, imageUrl: p.url })),
        }),
      });
      if (res.ok) {
        toast({ title: `${validPages.length} page${validPages.length > 1 ? "s" : ""} enregistrée${validPages.length > 1 ? "s" : ""} ✓` });
        setChapters((prev) => prev?.map((c) => c.id === editChapter.id ? { ...c, pageCount: validPages.length } : c) ?? null);
      } else {
        toast({ title: "Erreur lors de l'enregistrement des pages", variant: "destructive" });
      }
    } finally {
      setSavingPages(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Supprimer le chapitre "${title}" et toutes ses images définitivement ?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/chapters/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setChapters((prev) => prev?.filter((c) => c.id !== id) ?? null);
      if (editChapter?.id === id) setEditChapter(null);
      toast({ title: "Chapitre supprimé" });
    } else {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
    setDeleting(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-chapter-manager">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> {series.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{chapters?.length || 0} chapitre{(chapters?.length || 0) > 1 ? "s" : ""}</p>
          <Link href={`/create/${series.id}/chapter`} onClick={onClose}>
            <Button size="sm" className="gap-1" data-testid="button-new-chapter">
              <Plus className="w-3 h-3" /> Nouveau chapitre
            </Button>
          </Link>
        </div>

        {/* Chapter list */}
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : chapters?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">Aucun chapitre pour l'instant.</p>
            <Link href={`/create/${series.id}/chapter`} onClick={onClose}>
              <Button size="sm"><Plus className="w-3 h-3 mr-1" /> Créer le 1er chapitre</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters?.map((c: any) => (
              <div
                key={c.id}
                className={`rounded-lg border bg-card transition-colors ${editChapter?.id === c.id ? "border-primary/40 bg-primary/5" : "border-border"}`}
                data-testid={`chapter-row-${c.id}`}
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground font-mono w-10 shrink-0">Ch.{c.number}</span>
                    <span className="text-sm font-medium truncate">{c.title}</span>
                    {c.isPremium && (
                      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20 text-[10px] shrink-0 gap-0.5">
                        <Lock className="w-2.5 h-2.5" />{c.coinPrice}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">{c.pageCount || 0}p</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-0.5 mr-1">
                      <Eye className="w-3 h-3" />{c.viewCount}
                    </span>
                    <Button
                      variant={editChapter?.id === c.id ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => editChapter?.id === c.id ? setEditChapter(null) : handleEdit(c)}
                      data-testid={`button-edit-${c.id}`}
                    >
                      <PenTool className="w-3 h-3" />
                      <span className="hidden sm:inline">Modifier</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(c.id, c.title)}
                      disabled={deleting === c.id}
                      data-testid={`button-delete-${c.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {editChapter?.id === c.id && (
                  <div className="border-t border-border/50 p-3 space-y-4 bg-background/50">
                    {/* ── Title & Premium ── */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Titre du chapitre</Label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          data-testid="input-edit-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mt-5">
                          <Switch checked={editPremium} onCheckedChange={setEditPremium} id="edit-premium" />
                          <Label htmlFor="edit-premium" className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <Lock className="w-3.5 h-3.5 text-yellow-500" /> Premium
                          </Label>
                        </div>
                        {editPremium && (
                          <div className="flex items-center gap-2">
                            <Coins className="w-3.5 h-3.5 text-yellow-500" />
                            <Input
                              type="number"
                              min={1}
                              max={999}
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24 h-8 text-sm"
                              data-testid="input-coin-price"
                            />
                            <span className="text-xs text-muted-foreground">coins</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button size="sm" onClick={handleSaveTitle} className="gap-1" data-testid="button-save-chapter">
                      Enregistrer les infos
                    </Button>

                    {/* ── Page re-upload section ── */}
                    <div className="border-t border-border/40 pt-3">
                      <button
                        className="flex items-center gap-2 text-sm font-medium w-full text-left hover:text-primary transition-colors"
                        onClick={() => setShowPages(!showPages)}
                      >
                        <Upload className="w-4 h-4" />
                        Modifier les pages ({editPages.filter(p => p.url).length} actuellement)
                        {showPages ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                      </button>

                      {showPages && (
                        <div className="mt-3 space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Ajoutez de nouvelles images. Les pages existantes seront conservées, les nouvelles s'ajouteront à la suite.
                          </p>
                          <MultiPageUploader pages={editPages} onPagesChange={setEditPages} />
                          <Button
                            size="sm"
                            onClick={handleSavePages}
                            disabled={savingPages || editPages.filter(p => p.url).length === 0}
                            className="gap-1"
                            data-testid="button-save-pages"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {savingPages ? "Enregistrement..." : `Enregistrer ${editPages.filter(p => p.url).length} page${editPages.filter(p => p.url).length > 1 ? "s" : ""}`}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Dashboard Content ───────────────────────────────────────── */
function DashboardContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [managingSeries, setManagingSeries] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: series, isLoading } = useGetUserSeries(user?.id || 0, {
    query: { enabled: !!user?.id, queryKey: getGetUserSeriesQueryKey(user?.id || 0) },
  });

  const userXp = (user as any)?.xp || 0;

  const handleDeleteSeries = async (id: number, title: string) => {
    if (!confirm(`Supprimer la série "${title}" et tous ses chapitres ? Cette action est irréversible.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/series/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: getGetUserSeriesQueryKey(user?.id || 0) });
      toast({ title: "Série supprimée" });
    } else {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
    setDeletingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez vos séries et chapitres</p>
          <div className="mt-3 space-y-1.5">
            <ClassBadge xp={userXp} size="sm" showXp showDiscount />
            <XpProgressBar xp={userXp} className="max-w-[240px]" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/payouts">
            <Button variant="outline" size="sm" className="gap-1.5 text-green-500 border-green-500/30 hover:bg-green-500/10" data-testid="button-payouts">
              💰 Mes revenus
            </Button>
          </Link>
          <Link href="/create">
            <Button className="gap-1" data-testid="button-create-series">
              <Plus className="w-4 h-4" /> Nouvelle série
            </Button>
          </Link>
        </div>
      </div>

      {/* Series list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (series as any[])?.length ? (
        <div className="space-y-3">
          {(series as any[]).map((s: any) => (
            <div key={s.id} className="rounded-lg border border-border bg-card overflow-hidden" data-testid={`dashboard-series-${s.id}`}>
              <div className="flex items-center gap-4 p-4">
                <div className="w-14 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden" style={{ height: "72px" }}>
                  {s.coverImage ? (
                    <img src={s.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link href={`/series/${s.id}`}>
                      <h3 className="text-sm font-semibold hover:underline truncate">{s.title}</h3>
                    </Link>
                    <Badge variant="secondary" className="text-[10px]">{s.type}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{s.viewCount || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{s.likeCount || 0}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{s.chapterCount || 0} ch.</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setManagingSeries(managingSeries?.id === s.id ? null : s)}
                    data-testid={`button-manage-${s.id}`}
                  >
                    <PenTool className="w-3 h-3" />
                    <span className="hidden sm:inline">Gérer les chapitres</span>
                    <span className="sm:hidden">Gérer</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteSeries(s.id, s.title)}
                    disabled={deletingId === s.id}
                    title="Supprimer cette série"
                    data-testid={`button-delete-series-${s.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-muted-foreground mb-4">Aucune série publiée</p>
          <Link href="/create">
            <Button><Plus className="w-4 h-4 mr-2" /> Créer ma première série</Button>
          </Link>
        </div>
      )}

      {managingSeries && (
        <ChapterManager series={managingSeries} onClose={() => setManagingSeries(null)} />
      )}
    </div>
  );
}

export default function Dashboard() {
  return <RequireAuth><DashboardContent /></RequireAuth>;
}
