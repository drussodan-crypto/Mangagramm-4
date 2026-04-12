import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useListSeries, useListGenres } from "@workspace/api-client-react";
import { SeriesCard } from "@/components/series-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, BookOpen } from "lucide-react";

export default function Browse() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);

  const [search, setSearch] = useState(params.get("search") || "");
  const [genre, setGenre] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [sort, setSort] = useState(params.get("sort") || "latest");

  const { data: genres } = useListGenres();
  const { data, isLoading } = useListSeries({
    search: search || undefined,
    genre: genre || undefined,
    type: (type || undefined) as any,
    status: (status || undefined) as any,
    sort: (sort || "latest") as any,
    limit: 40,
    offset: 0,
  });

  const seriesList = (data as any)?.series || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="page-browse">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold mb-6">Browse</h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title..."
              className="pl-9 bg-secondary border-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-browse-search"
            />
          </div>
          <div className="flex gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[130px]" data-testid="select-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manga">Manga</SelectItem>
                <SelectItem value="webtoon">Webtoon</SelectItem>
                <SelectItem value="comic">Comic</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="hiatus">Hiatus</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[130px]" data-testid="select-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {genres && (genres as any[]).length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={genre === "" ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setGenre("")}
              data-testid="genre-all"
            >
              All
            </Badge>
            {(genres as any[]).map((g: any) => (
              <Badge
                key={g.id}
                variant={genre === g.slug ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setGenre(genre === g.slug ? "" : g.slug)}
                data-testid={`genre-${g.slug}`}
              >
                {g.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : seriesList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {seriesList.map((s: any) => (
            <SeriesCard key={s.id} {...s} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No series found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}
