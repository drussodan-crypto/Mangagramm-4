import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useGetUserSeries, getGetUserSeriesQueryKey } from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { ClassBadge, XpProgressBar } from "@/components/class-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Heart, BookOpen, PenTool, Trash2, Coins, Lock } from "lucide-react";

function ChapterManager({ series, onClose }: { series: any; onClose: () => void }) {
  const [chapters, setChapters] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editChapter, setEditChapter] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPremium, setEditPremium] = useState(false);
  const [editPrice, setEditPrice] = useState("5");
  const [deleting, setDeleting] = useState<number | null>(null);
  const { toast } = useToast();

  const loadChapters = async () => {
    try {
      const res = await fetch(`/api/series/${series.id}/chapters`, { credentials: "include" });
      if (res.ok) setChapters(await res.json());
    } finally { setLoading(false); }
  };

  if (chapters === null && loading) { loadChapters(); }

  const handleEdit = (c: any) => {
    setEditChapter(c);
    setEditTitle(c.title);
    setEditPremium(c.isPremium || false);
    setEditPrice(String(c.coinPrice || 5));
  };

  const handleSave = async () => {
    if (!editChapter) return;
    const res = await fetch(`/api/chapters/${editChapter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: editTitle, isPremium: editPremium, coinPrice: parseInt(editPrice) || 5 }),
    });
    if (res.ok) {
      const updated = await res.json();
      setChapters((prev) => prev?.map((c) => c.id === updated.id ? updated : c) ?? null);
      setEditChapter(null);
      toast({ title: "Chapitre mis à jour" });
    } else {
      toast({ title: "Erreur de mise à jour", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce chapitre définitivement ?")) return;
    setDeleting(id);
    const res = await fetch(`/api/chapters/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setChapters((prev) => prev?.filter((c) => c.id !== id) ?? null);
      toast({ title: "Chapitre supprimé" });
    } else {
      toast({ title: "Erreur", variant: "destructive" });
    }
    setDeleting(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto" data-testid="dialog-chapter-manager">
        <DialogHeader>
          <DialogTitle>Chapitres — {series.title}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-muted-foreground">{chapters?.length || 0} chapitre{(chapters?.length || 0) > 1 ? "s" : ""}</p>
          <Link href={`/create/${series.id}/chapter`} onClick={onClose}>
            <Button size="sm" className="gap-1" data-testid="button-new-chapter"><Plus className="w-3 h-3" /> Nouveau chapitre</Button>
          </Link>
        </div>

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
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card" data-testid={`chapter-row-${c.id}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground font-mono w-10 shrink-0">Ch.{c.number}</span>
                  <span className="text-sm font-medium truncate">{c.title}</span>
                  {c.isPremium && (
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20 text-[10px] shrink-0 gap-0.5">
                      <Lock className="w-2.5 h-2.5" />{c.coinPrice}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-0.5"><Eye className="w-3 h-3" />{c.viewCount}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)} data-testid={`button-edit-${c.id}`}>
                    <PenTool className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)} disabled={deleting === c.id} data-testid={`button-delete-${c.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editChapter && (
          <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <h4 className="text-sm font-semibold">Modifier : Ch.{editChapter.number} — {editChapter.title}</h4>
            <div>
              <Label className="text-xs mb-1.5 block">Titre</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} data-testid="input-edit-title" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editPremium} onCheckedChange={setEditPremium} id="edit-premium" data-testid="switch-premium" />
              <Label htmlFor="edit-premium" className="flex items-center gap-1.5 cursor-pointer text-sm">
                <Lock className="w-3.5 h-3.5 text-yellow-500" /> Chapitre Premium
              </Label>
            </div>
            {editPremium && (
              <div>
                <Label className="text-xs mb-1.5 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-yellow-500" /> Prix en Coins
                </Label>
                <Input type="number" min={1} max={999} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-28" data-testid="input-coin-price" />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} data-testid="button-save-chapter">Enregistrer</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditChapter(null)}>Annuler</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

  const handleDeleteSeries = async (id: number) => {
    if (!confirm("Supprimer cette série et tous ses chapitres ? Cette action est irréversible.")) return;
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
                    <h3 className="text-sm font-semibold truncate">{s.title}</h3>
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
                    onClick={() => setManagingSeries(s)}
                    data-testid={`button-manage-${s.id}`}
                  >
                    <PenTool className="w-3 h-3" /> Gérer
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteSeries(s.id)}
                    disabled={deletingId === s.id}
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
