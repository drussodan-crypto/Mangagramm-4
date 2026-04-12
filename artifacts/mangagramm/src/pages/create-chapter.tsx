import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useCreateChapter, useAddPages, useGetSeries, getGetSeriesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CreateChapter() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const sId = parseInt(seriesId || "0", 10);
  const [, setLocation] = useLocation();

  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<{ url: string }[]>([{ url: "" }]);

  const { data: series } = useGetSeries(sId, {
    query: { enabled: !!sId, queryKey: getGetSeriesQueryKey(sId) },
  });

  const createChapter = useCreateChapter();
  const addPages = useAddPages();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createChapter.mutate({ seriesId: sId, data: { number: parseFloat(number), title } }, {
      onSuccess: (chapter: any) => {
        const validPages = pages.filter(p => p.url.trim());
        if (validPages.length > 0) {
          addPages.mutate({
            chapterId: chapter.id,
            data: {
              pages: validPages.map((p, i) => ({
                pageNumber: i + 1,
                imageUrl: p.url,
              })),
            },
          }, {
            onSuccess: () => setLocation(`/series/${sId}`),
          });
        } else {
          setLocation(`/series/${sId}`);
        }
      },
    });
  };

  const addPage = () => setPages([...pages, { url: "" }]);
  const removePage = (i: number) => setPages(pages.filter((_, idx) => idx !== i));
  const updatePage = (i: number, url: string) => {
    const updated = [...pages];
    updated[i] = { url };
    setPages(updated);
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
          <h1 className="text-2xl font-serif font-bold">Add Chapter</h1>
          <p className="text-sm text-muted-foreground">{(series as any)?.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="number">Chapter Number *</Label>
            <Input id="number" type="number" step="0.5" value={number} onChange={(e) => setNumber(e.target.value)} required data-testid="input-number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-title" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Pages</Label>
            <Button type="button" variant="outline" size="sm" onClick={addPage} data-testid="button-add-page">
              <Plus className="w-3 h-3 mr-1" /> Add Page
            </Button>
          </div>
          {pages.map((page, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex items-center justify-center w-8 text-xs text-muted-foreground shrink-0">{i + 1}</div>
              <Input
                value={page.url}
                onChange={(e) => updatePage(i, e.target.value)}
                placeholder="Page image URL..."
                data-testid={`input-page-${i}`}
              />
              {pages.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removePage(i)} data-testid={`button-remove-page-${i}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={createChapter.isPending} data-testid="button-submit-chapter">
          {createChapter.isPending ? "Creating..." : "Create Chapter"}
        </Button>
      </form>
    </div>
  );
}
