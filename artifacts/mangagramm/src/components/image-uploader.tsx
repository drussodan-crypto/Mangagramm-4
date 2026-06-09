import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

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
    if (!file.type.startsWith("image/")) { setError("Veuillez sélectionner une image"); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Taille max : 20 Mo"); return; }
    setError(null); setIsUploading(true); setProgress(0);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("Impossible d'obtenir l'URL d'upload");
      const { uploadURL, objectPath } = await metaRes.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); });
        xhr.addEventListener("load", () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Upload failed: ${xhr.status}`)); });
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
      setIsUploading(false); setProgress(0);
    }
  };

  const aspectClass = aspect === "avatar" ? "aspect-square" : aspect === "page" ? "aspect-[2/3]" : "aspect-[3/4]";
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className={`relative ${aspectClass} rounded-lg border-2 border-dashed border-border bg-muted cursor-pointer overflow-hidden transition-colors hover:border-foreground/40`}
        onClick={() => !isUploading && inputRef.current?.click()} data-testid="button-image-upload">
        {preview ? (
          <>
            <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
            {isUploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}
            {!isUploading && (
              <button className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                onClick={(e) => { e.stopPropagation(); setPreview(null); onUpload("", ""); }} data-testid="button-remove-image">
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Upload className="w-8 h-8 mb-2" /><p className="text-xs text-center px-2">{t("select_from_gallery")}</p></>}
          </div>
        )}
        {isUploading && <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted"><div className="h-full bg-foreground transition-all duration-300" style={{ width: `${progress}%` }} /></div>}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); e.target.value = ""; }}
        data-testid="input-file-upload" />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ─── Types ──────────────────────────────────────────────────── */
type PageItem = { url: string; preview?: string };
type PagesUpdater = PageItem[] | ((prev: PageItem[]) => PageItem[]);

interface MultiPageUploaderProps {
  pages: PageItem[];
  onPagesChange: (updater: PagesUpdater) => void;
}

/**
 * Tri naturel par nom de fichier pour respecter l'ordre numérique :
 * [page10.jpg, page1.jpg, page2.jpg] → [page1.jpg, page2.jpg, page10.jpg]
 */
function naturalSort(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
}

/* ─── MultiPageUploader ─────────────────────────────────────────
   Corrections de l'ordre des pages :

   1. startIndex via ref (jamais via callback React) — fiable à 100%
   2. Tri naturel des fichiers par nom avant upload
   3. Mise à jour fonctionnelle (prev) => next — zéro race condition
   4. Aperçu local immédiat via blob URL pendant l'upload
──────────────────────────────────────────────────────────────── */
export function MultiPageUploader({ pages, onPagesChange }: MultiPageUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});

  /**
   * Ref qui suit TOUJOURS le nombre de pages actuel.
   * Mise à jour à chaque render → lecture synchrone garantie.
   * On l'utilise pour calculer startIndex AVANT toute mise à jour de state.
   */
  const pageLengthRef = useRef(pages.length);
  pageLengthRef.current = pages.length;

  const uploadFile = async (file: File, index: number) => {
    // Aperçu local immédiat
    const localBlob = URL.createObjectURL(file);
    onPagesChange((prev) => {
      const next = [...prev];
      if (next[index] !== undefined) next[index] = { url: "", preview: localBlob };
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
      if (!uploadRes.ok) throw new Error(`HTTP ${uploadRes.status}`);

      const servingPath = `/api/storage${objectPath}`;

      // ✅ Mise à jour fonctionnelle → lit TOUJOURS le state le plus récent
      // Même si N uploads finissent simultanément, chacun cible son index précis
      onPagesChange((prev) => {
        const next = [...prev];
        if (next[index] !== undefined) next[index] = { url: servingPath, preview: servingPath };
        return next;
      });

      URL.revokeObjectURL(localBlob);
    } catch {
      setErrors((prev) => ({ ...prev, [index]: "Échec" }));
      onPagesChange((prev) => {
        const next = [...prev];
        if (next[index] !== undefined) next[index] = { url: "", preview: "" };
        return next;
      });
      URL.revokeObjectURL(localBlob);
    } finally {
      setUploading((prev) => { const s = new Set(prev); s.delete(index); return s; });
    }
  };

  const handleFilesSelected = (files: FileList) => {
    const rawFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (rawFiles.length === 0) return;

    // Tri naturel par nom : garantit l'ordre numérique (page1 < page2 < page10)
    const imageFiles = naturalSort(rawFiles);

    // Lire startIndex depuis le ref — synchrone, jamais stale
    const startIndex = pageLengthRef.current;
    // Mettre à jour immédiatement pour les appels concurrents éventuels
    pageLengthRef.current += imageFiles.length;

    // Ajouter les placeholders en une seule mise à jour
    onPagesChange((prev) => [
      ...prev,
      ...imageFiles.map(() => ({ url: "", preview: "" })),
    ]);

    // Lancer les uploads — chaque fichier sait exactement où s'écrire
    imageFiles.forEach((file, i) => uploadFile(file, startIndex + i));
  };

  const removePage = (index: number) => {
    onPagesChange((prev) => prev.filter((_, i) => i !== index));
    // Réindexer les erreurs
    setErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
    setUploading((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
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
  const failedCount = Object.keys(errors).length;

  return (
    <div className="space-y-3">
      {/* Barre de statut */}
      {uploadingCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Upload en cours… {readyCount}/{pages.length} prêtes</span>
        </div>
      )}

      {/* Grille des vignettes */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {pages.map((page, i) => (
          <div key={i} className="relative group" data-testid={`page-thumb-${i}`}>
            <div className="aspect-[2/3] rounded-lg bg-muted overflow-hidden border border-border">
              {uploading.has(i) ? (
                page.preview ? (
                  <div className="relative w-full h-full">
                    <img src={page.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-white drop-shadow" />
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
                <img src={page.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Numéro de page */}
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/75 text-white rounded px-1 font-mono leading-tight">
              {i + 1}
            </span>

            {/* Contrôles */}
            {!uploading.has(i) && (
              <div className="absolute top-1 right-1 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                {i > 0 && (
                  <button onClick={() => movePage(i, i - 1)} className="p-0.5 bg-black/70 rounded text-white hover:bg-black/90" title="← Avant">
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}
                {i < pages.length - 1 && (
                  <button onClick={() => movePage(i, i + 1)} className="p-0.5 bg-black/70 rounded text-white hover:bg-black/90" title="→ Après">
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => removePage(i)} className="p-0.5 bg-black/70 rounded text-white hover:bg-red-600" title="Supprimer" data-testid={`button-remove-page-${i}`}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Bouton ajouter */}
        <div
          className="aspect-[2/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-foreground/40 hover:bg-accent/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          data-testid="button-add-pages"
        >
          <Upload className="w-5 h-5 mb-1" />
          <span className="text-[9px] text-center px-1 leading-tight">{t("select_from_gallery")}</span>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFilesSelected(e.target.files); e.target.value = ""; }}
        data-testid="input-pages-file" />

      {pages.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {readyCount}/{pages.length} page{pages.length > 1 ? "s" : ""} prête{readyCount > 1 ? "s" : ""}
            {uploadingCount > 0 && <span className="text-yellow-500 ml-2">⏳ upload en cours…</span>}
            {uploadingCount === 0 && failedCount > 0 && <span className="text-destructive ml-2">⚠ {failedCount} en échec</span>}
          </p>
          {uploadingCount === 0 && readyCount > 0 && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Utilisez ← → sur chaque vignette pour réorganiser l'ordre si besoin.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
