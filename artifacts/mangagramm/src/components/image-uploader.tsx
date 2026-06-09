import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  label?: string;
  currentUrl?: string;
  onUpload: (objectPath: string, previewUrl: string) => void;
  aspect?: "cover" | "page" | "avatar";
  accept?: string;
}

export function ImageUploader({ label, currentUrl, onUpload, aspect = "cover", accept = "image/*" }: ImageUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image");
      return;
    }
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Taille max : 20 Mo");
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("Impossible d'obtenir l'URL d'upload");
      const { uploadURL, objectPath } = await metaRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Erreur réseau")));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      const servingPath = `/api/storage${objectPath}`;
      setPreview(servingPath);
      onUpload(servingPath, servingPath);
    } catch {
      setError("Échec de l'upload");
      setPreview(null);
      onUpload("", "");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const aspectClass = aspect === "avatar" ? "aspect-square" : aspect === "page" ? "aspect-[2/3]" : "aspect-[3/4]";

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div
        className={`relative ${aspectClass} rounded-lg border-2 border-dashed border-border bg-muted cursor-pointer overflow-hidden transition-colors hover:border-foreground/40`}
        onClick={() => !isUploading && inputRef.current?.click()}
        data-testid="button-image-upload"
      >
        {preview ? (
          <>
            <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            {!isUploading && (
              <button
                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                onClick={(e) => { e.stopPropagation(); setPreview(null); onUpload("", ""); }}
                data-testid="button-remove-image"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 mb-2" />
                <p className="text-xs text-center px-2">{t("select_from_gallery")}</p>
              </>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div className="h-full bg-foreground transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
        data-testid="input-file-upload"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ─── Types ──────────────────────────────────────────────────── */
type PageItem = { url: string; preview?: string };
type PagesUpdater = PageItem[] | ((prev: PageItem[]) => PageItem[]);

interface MultiPageUploaderProps {
  pages: PageItem[];
  /**
   * Accepte soit un nouveau tableau, soit une mise à jour fonctionnelle
   * (prev) => next — identique à React setState.
   * Passer directement `setPages` depuis le composant parent.
   */
  onPagesChange: (updater: PagesUpdater) => void;
}

/* ─── MultiPageUploader ─────────────────────────────────────────
   Fix race condition: toutes les mises à jour utilisent des updaters
   fonctionnels `(prev) => next` pour éviter que des uploads parallèles
   ne s'écrasent mutuellement (problème de closure/stale state).
   L'ordre des pages est GARANTI car chaque upload cible son index précis.
──────────────────────────────────────────────────────────────── */
export function MultiPageUploader({ pages, onPagesChange }: MultiPageUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});

  const uploadFile = async (file: File, index: number) => {
    // Créer un aperçu local immédiat pour affichage instantané
    const localPreview = URL.createObjectURL(file);
    onPagesChange((prev) => {
      const next = [...prev];
      next[index] = { url: "", preview: localPreview };
      return next;
    });

    setUploading((prev) => new Set(prev).add(index));
    setErrors((prev) => { const e = { ...prev }; delete e[index]; return e; });

    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("URL d'upload introuvable");
      const { uploadURL, objectPath } = await metaRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error(`Upload HTTP ${uploadRes.status}`);

      const servingPath = `/api/storage${objectPath}`;

      // ✅ Mise à jour fonctionnelle : lit TOUJOURS le state le plus récent
      // → zéro race condition même si N uploads finissent simultanément
      onPagesChange((prev) => {
        const next = [...prev];
        next[index] = { url: servingPath, preview: servingPath };
        return next;
      });

      // Libérer l'URL blob
      URL.revokeObjectURL(localPreview);
    } catch {
      setErrors((prev) => ({ ...prev, [index]: "Échec" }));
      onPagesChange((prev) => {
        const next = [...prev];
        next[index] = { url: "", preview: "" };
        return next;
      });
      URL.revokeObjectURL(localPreview);
    } finally {
      setUploading((prev) => { const s = new Set(prev); s.delete(index); return s; });
    }
  };

  const handleFilesSelected = (files: FileList) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    // Déterminer startIndex AVANT d'ajouter les placeholders
    let startIndex = 0;
    onPagesChange((prev) => {
      startIndex = prev.length;
      // Ajouter les placeholders à la fin, dans l'ordre exact de sélection
      return [...prev, ...imageFiles.map(() => ({ url: "", preview: "" }))];
    });

    // Lancer les uploads en parallèle APRÈS le tick React
    // On passe index explicitement → chaque upload sait exactement où écrire
    setTimeout(() => {
      imageFiles.forEach((file, i) => uploadFile(file, startIndex + i));
    }, 0);
  };

  const removePage = (index: number) => {
    onPagesChange((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const e = { ...prev };
      delete e[index];
      return e;
    });
  };

  const movePage = (from: number, to: number) => {
    onPagesChange((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const uploadingCount = uploading.size;
  const readyCount = pages.filter((p) => p.url).length;

  return (
    <div className="space-y-3">
      {/* Status bar */}
      {uploadingCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Upload en cours : {uploadingCount} image{uploadingCount > 1 ? "s" : ""}…</span>
          <span className="ml-auto text-xs">{readyCount}/{pages.length} prêtes</span>
        </div>
      )}

      {/* Page thumbnails grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {pages.map((page, i) => (
          <div key={i} className="relative group" data-testid={`page-thumb-${i}`}>
            <div className="aspect-[2/3] rounded-lg bg-muted overflow-hidden border border-border">
              {uploading.has(i) ? (
                /* Pendant l'upload : afficher l'aperçu local si dispo */
                page.preview ? (
                  <div className="relative w-full h-full">
                    <img src={page.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Upload…</span>
                  </div>
                )
              ) : errors[i] ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-destructive/10">
                  <X className="w-5 h-5 text-destructive" />
                  <span className="text-[10px] text-destructive">Erreur</span>
                </div>
              ) : page.url ? (
                <img
                  src={page.url}
                  alt={`Page ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Page number badge */}
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white rounded px-1 leading-tight">
              {i + 1}
            </span>

            {/* Controls — hover on desktop, visible on mobile */}
            {!uploading.has(i) && (
              <div className="absolute top-1 right-1 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                {i > 0 && (
                  <button
                    onClick={() => movePage(i, i - 1)}
                    className="p-0.5 bg-black/70 rounded text-white hover:bg-black/90"
                    title="Monter"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}
                {i < pages.length - 1 && (
                  <button
                    onClick={() => movePage(i, i + 1)}
                    className="p-0.5 bg-black/70 rounded text-white hover:bg-black/90"
                    title="Descendre"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => removePage(i)}
                  className="p-0.5 bg-black/70 rounded text-white hover:bg-red-600"
                  title="Supprimer"
                  data-testid={`button-remove-page-${i}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add more button */}
        <div
          className="aspect-[2/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-foreground/40 hover:bg-accent/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          data-testid="button-add-pages"
        >
          <Upload className="w-5 h-5 mb-1" />
          <span className="text-[9px] text-center px-1 leading-tight">{t("select_from_gallery")}</span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
        data-testid="input-pages-file"
      />

      {pages.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {readyCount}/{pages.length} page{pages.length > 1 ? "s" : ""} prête{readyCount > 1 ? "s" : ""}
          {uploadingCount > 0 && <span className="text-yellow-500 ml-2">⏳ upload en cours…</span>}
          {uploadingCount === 0 && readyCount < pages.length && (
            <span className="text-destructive ml-2">⚠ {pages.length - readyCount} image{pages.length - readyCount > 1 ? "s" : ""} en échec — supprimez-les</span>
          )}
        </p>
      )}
    </div>
  );
}
