import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateSeries, useListGenres } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function CreateSeries() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"manga" | "webtoon" | "comic">("manga");
  const [coverImage, setCoverImage] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [mature, setMature] = useState(false);

  const { data: genres } = useListGenres();
  const createSeries = useCreateSeries();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSeries.mutate({
      data: {
        title,
        description: description || undefined,
        type,
        coverImage: coverImage || undefined,
        genres: selectedGenres,
        mature,
      },
    }, {
      onSuccess: (data: any) => {
        setLocation(`/series/${data.id}`);
      },
    });
  };

  const toggleGenre = (slug: string) => {
    setSelectedGenres(prev =>
      prev.includes(slug) ? prev.filter(g => g !== slug) : [...prev, slug]
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="page-create-series">
      <h1 className="text-2xl font-serif font-bold mb-6">Create New Series</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-title" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} data-testid="input-description" />
        </div>

        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger data-testid="select-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manga">Manga</SelectItem>
              <SelectItem value="webtoon">Webtoon</SelectItem>
              <SelectItem value="comic">Comic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverImage">Cover Image URL</Label>
          <Input id="coverImage" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." data-testid="input-cover" />
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
          <Label htmlFor="mature">Mature content (18+)</Label>
        </div>

        <Button type="submit" className="w-full" disabled={createSeries.isPending} data-testid="button-submit-create">
          {createSeries.isPending ? "Creating..." : "Create Series"}
        </Button>
      </form>
    </div>
  );
}
