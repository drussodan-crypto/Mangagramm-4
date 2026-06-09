import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useGetSeries, getGetSeriesQueryKey } from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { MultiPageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function CreateChapterForm() {
  const { t } = useTranslation();
  const { seriesId } = useParams<{ seriesId: string }>();
  const sId = parseInt(seriesId || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<{ url: string; preview?: string }[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [coinPrice, setCoinPrice] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: series } = useGetSeries(sId, {
    query: { enabled: !!sId, queryKey: getGetSeriesQueryKey(sId) },
  });

  // Vrai si au moins une page est en cours d'upload (url vide mais preview présent)
  const hasUploadingPages = pages.some((p) => !p.url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !title) return;

    if (hasUploadingPages) {
      toast({ title: "Upload en cours", description: "Attendez que toutes les images soient uploadées avant de publier.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const chapterRes = await fetch(`/api/series/${sId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          number: parseFloat(number),
          title,
          isPremium,
          coinPrice: isPremium ? parseInt(coinPrice) || 5 : 0,
        }),
      });

      if (!chapterRes.ok) {
        const err = await chapterRes.json().catch(() => ({ error: "Erreur lors de la création" }));
        throw new Error(err.error || "Erreur");
      }

      const chapter = await chapterRes.json();

      // Envoyer uniquement les pages avec url valide, dans l'ordre du tableau
      const validPages = pages.filter((p) => p.url && p.url.trim());
      if (validPages.length > 0) {
        const pagesRes = await fetch(`/api/chapters/${chapter.id}/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            // pageNumber commence à 1, ordre exact du tableau
            pages: validPages.map((p, i) => ({ pageNumber: i + 1, imageUrl: p.url })),
          }),
        });

        if (!pagesRes.ok) throw new Error("Erreur lors de l'ajout des pages");
      }

      toast({ title: "Chapitre créé !", description: `Chapitre ${number} "${title}" ${isPremium ? `— Premium (${coinPrice} Coins)` : ""} — ${validPages.length} page${validPages.length > 1 ? "s" : ""} ajoutée${validPages.length > 1 ? "s" : ""}.` });
      setLocation(`/series/${sId}`);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="page-create-chapter">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/series/${sId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold">{t("add_chapter")}</h1>
          <p className="text-sm text-muted-foreground">{(series as any)?.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="number">Numéro *</Label>
            <Input id="number" type="number" step="0.5" min="0" value={number} onChange={(e) => setNumber(e.target.value)} required data-testid="input-number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-title" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-500" />
              <Label htmlFor="premium-switch" className="cursor-pointer font-medium">Chapitre Premium</Label>
              {isPremium && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20 text-xs">★ Premium</Badge>}
            </div>
            <Switch id="premium-switch" checked={isPremium} onCheckedChange={setIsPremium} data-testid="switch-premium" />
          </div>
          {isPremium && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-500" /> Prix en Coins</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={coinPrice}
                onChange={(e) => setCoinPrice(e.target.value)}
                className="w-32"
                data-testid="input-coin-price"
              />
              <p className="text-xs text-muted-foreground">Les lecteurs devront payer {coinPrice || "?"} Coins pour accéder. Vous recevez 70%.</p>
            </div>
          )}
          {!isPremium && (
            <p className="text-xs text-muted-foreground">Ce chapitre sera gratuit pour tous les lecteurs.</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>{t("upload_pages")}</Label>
          <MultiPageUploader pages={pages} onPagesChange={setPages} />
          {pages.length > 0 && (
            <p className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} sélectionnée{pages.length > 1 ? "s" : ""}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !number || !title || hasUploadingPages}
          data-testid="button-submit-chapter"
        >
          {isSubmitting ? "Création en cours…" : hasUploadingPages ? "⏳ Upload en cours…" : t("add_chapter")}
        </Button>
        {hasUploadingPages && (
          <p className="text-xs text-center text-yellow-500">Patienter que toutes les images soient chargées.</p>
        )}
      </form>
    </div>
  );
}

export default function CreateChapter() {
  return (
    <RequireAuth>
      <CreateChapterForm />
    </RequireAuth>
  );
}
