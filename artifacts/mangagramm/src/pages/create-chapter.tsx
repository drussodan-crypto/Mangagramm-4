import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useGetSeries, getGetSeriesQueryKey } from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { MultiPageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: series } = useGetSeries(sId, {
    query: { enabled: !!sId, queryKey: getGetSeriesQueryKey(sId) },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !title) return;
    setIsSubmitting(true);

    try {
      const chapterRes = await fetch(`/api/series/${sId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ number: parseFloat(number), title }),
      });

      if (!chapterRes.ok) {
        const err = await chapterRes.json().catch(() => ({ error: "Failed to create chapter" }));
        throw new Error(err.error || "Failed to create chapter");
      }

      const chapter = await chapterRes.json();

      const validPages = pages.filter((p) => p.url.trim());
      if (validPages.length > 0) {
        const pagesRes = await fetch(`/api/chapters/${chapter.id}/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            pages: validPages.map((p, i) => ({ pageNumber: i + 1, imageUrl: p.url })),
          }),
        });

        if (!pagesRes.ok) {
          throw new Error("Failed to add pages");
        }
      }

      toast({ title: "Chapitre créé !", description: `Chapitre ${number} "${title}" ajouté.` });
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
            <Input id="number" type="number" step="0.5" value={number} onChange={(e) => setNumber(e.target.value)} required data-testid="input-number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-title" />
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t("upload_pages")}</Label>
          <MultiPageUploader pages={pages} onPagesChange={setPages} />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !number || !title} data-testid="button-submit-chapter">
          {isSubmitting ? "Création..." : t("add_chapter")}
        </Button>
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
