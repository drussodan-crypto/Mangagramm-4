import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
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
      setError("Please select an image file");
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be under 20MB");
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

      if (!metaRes.ok) throw new Error("Failed to get upload URL");
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
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      const servingPath = `/api/storage${objectPath}`;
      onUpload(servingPath, servingPath);
      setProgress(100);
    } catch (err) {
      setError("Upload failed. Please try again.");
      setPreview(currentUrl || null);
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const aspectClasses = {
    cover: "aspect-[3/4] max-w-[160px]",
    page: "aspect-[2/3] max-w-full",
    avatar: "aspect-square max-w-[120px] rounded-full",
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}

      <div
        className={`relative ${aspectClasses[aspect]} rounded-lg overflow-hidden border-2 border-dashed border-border hover:border-foreground/40 transition-colors bg-muted cursor-pointer group`}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs">{t("select_from_gallery")}</p>
              </div>
            </div>
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
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
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

interface MultiPageUploaderProps {
  pages: { url: string; preview?: string }[];
  onPagesChange: (pages: { url: string; preview?: string }[]) => void;
}

export function MultiPageUploader({ pages, onPagesChange }: MultiPageUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Set<number>>(new Set());

  const uploadFile = async (file: File, index: number) => {
    setUploading((prev) => new Set(prev).add(index));
    const localPreview = URL.createObjectURL(file);

    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();

      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const servingPath = `/api/storage${objectPath}`;
      const newPages = [...pages];
      newPages[index] = { url: servingPath, preview: servingPath };
      onPagesChange(newPages);
    } catch (err) {
      console.error("Page upload failed:", err);
      const newPages = [...pages];
      newPages[index] = { url: "", preview: localPreview };
      onPagesChange(newPages);
    } finally {
      setUploading((prev) => { const s = new Set(prev); s.delete(index); return s; });
    }
  };

  const handleFilesSelected = async (files: FileList) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const startIndex = pages.length;
    const newPages = [...pages, ...imageFiles.map(() => ({ url: "" }))];
    onPagesChange(newPages);

    for (let i = 0; i < imageFiles.length; i++) {
      uploadFile(imageFiles[i], startIndex + i);
    }
  };

  const removePage = (index: number) => {
    const newPages = pages.filter((_, i) => i !== index);
    onPagesChange(newPages);
  };

  const movePage = (from: number, to: number) => {
    const newPages = [...pages];
    const [moved] = newPages.splice(from, 1);
    newPages.splice(to, 0, moved);
    onPagesChange(newPages);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {pages.map((page, i) => (
          <div key={i} className="relative group">
            <div className="aspect-[2/3] rounded bg-muted overflow-hidden border border-border">
              {uploading.has(i) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : page.preview || page.url ? (
                <img src={page.preview || page.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                </div>
              )}
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
              <button
                onClick={() => removePage(i)}
                className="p-1 bg-black/60 rounded-full text-white text-xs"
                data-testid={`button-remove-page-${i}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white rounded px-1">{i + 1}</span>
          </div>
        ))}

        <div
          className="aspect-[2/3] rounded border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-foreground/40 hover:bg-accent/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          data-testid="button-add-pages"
        >
          <Upload className="w-6 h-6 mb-1" />
          <span className="text-[10px] text-center px-1">{t("select_from_gallery")}</span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFilesSelected(e.target.files); e.target.value = ""; }}
        data-testid="input-pages-file"
      />

      {pages.length > 0 && (
        <p className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} sélectionnée{pages.length > 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
