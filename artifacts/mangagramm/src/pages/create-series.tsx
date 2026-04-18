import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useListGenres } from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

function CreateSeriesForm() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"manga" | "webtoon" | "comic">("manga");
  const [coverImage, setCoverImage] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [mature, setMature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: genres } = useListGenres();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description: description || undefined,
          type,
          coverImage: coverImage || undefined,
          genres: selectedGenres,
          mature,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create series" }));
        throw new Error(err.error || "Failed to create series");
      }

      const data = await res.json();
      toast({ title: "Série créée !", description: `"${title}" a été créée avec succès.` });
      setLocation(`/series/${data.id}`);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGenre = (slug: string) => {
    setSelectedGenres((prev) => prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="page-create-series">
      <h1 className="text-2xl font-serif font-bold mb-6">{t("create_series")}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-6 items-start">
          <ImageUploader
            label={t("upload_cover")}
            onUpload={(path) => setCoverImage(path)}
            aspect="cover"
          />
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-title" />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as "manga" | "webtoon" | "comic")}>
                <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manga">Manga</SelectItem>
                  <SelectItem value="webtoon">Webtoon</SelectItem>
                  <SelectItem value="comic">Comic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} data-testid="input-description" />
        </div>

        <div className="space-y-2">
          <Label>Genres</Label>
          <div className="flex flex-wrap gap-2">
            {(genres as any[])?.map((g: any) => (
              <Badge
                key={g.id}
                variant={selectedGenres.includes(g.slug) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleGenre(g.slug)}
                data-testid={`genre-${g.slug}`}
              >
                {g.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={mature} onCheckedChange={setMature} id="mature" data-testid="switch-mature" />
          <Label htmlFor="mature">{t("mature_content")}</Label>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !title} data-testid="button-submit-create">
          {isSubmitting ? "Création..." : t("create_series")}
        </Button>
      </form>
    </div>
  );
}

export default function CreateSeries() {
  return (
    <RequireAuth>
      <CreateSeriesForm />
    </RequireAuth>
  );
}
