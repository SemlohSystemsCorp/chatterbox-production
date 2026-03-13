"use client";

import { useState } from "react";
import { X, Download, FileText, Film, Music, FileArchive } from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return FileText;
  if (fileType.startsWith("video/")) return Film;
  if (fileType.startsWith("audio/")) return Music;
  if (fileType === "application/zip" || fileType === "application/x-zip-compressed") return FileArchive;
  return FileText;
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 z-10 rounded-full bg-white/10 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-white/70">{alt}</p>
          <a
            href={src}
            download={alt}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Download className="h-3 w-3" />
            Open original
          </a>
        </div>
      </div>
    </div>
  );
}

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<{ src: string; alt: string } | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {attachments.map((att) => {
          const isImage = att.file_type?.startsWith("image/");
          const isVideo = att.file_type?.startsWith("video/");
          const isAudio = att.file_type?.startsWith("audio/");

          if (isImage) {
            return (
              <button
                key={att.id}
                type="button"
                onClick={() => setLightboxUrl({ src: att.file_url, alt: att.file_name })}
                className="block h-[240px] w-[240px] overflow-hidden rounded-lg border border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md"
              >
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          }

          if (isVideo) {
            return (
              <div
                key={att.id}
                className="overflow-hidden rounded-lg border border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <video
                  src={att.file_url}
                  controls
                  preload="metadata"
                  className="max-h-[280px] max-w-[400px]"
                >
                  Your browser does not support the video tag.
                </video>
                <div className="flex items-center gap-2 border-t border-border bg-accent/30 px-2.5 py-1.5">
                  <Film className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 truncate text-xs text-muted-foreground">{att.file_name}</p>
                  {att.file_size && (
                    <span className="shrink-0 text-[11px] text-muted-foreground/70">{formatFileSize(att.file_size)}</span>
                  )}
                </div>
              </div>
            );
          }

          if (isAudio) {
            return (
              <div
                key={att.id}
                className="w-full max-w-[320px] overflow-hidden rounded-lg border border-border"
              >
                <div className="flex items-center gap-2 bg-accent/30 px-3 py-2">
                  <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{att.file_name}</p>
                    {att.file_size && (
                      <p className="text-[11px] text-muted-foreground">{formatFileSize(att.file_size)}</p>
                    )}
                  </div>
                </div>
                <audio src={att.file_url} controls preload="metadata" className="w-full" />
              </div>
            );
          }

          // Generic file
          const Icon = getFileIcon(att.file_type);
          return (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-3 py-2 transition-colors hover:bg-accent"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{att.file_name}</p>
                {att.file_size && (
                  <p className="text-[11px] text-muted-foreground">{formatFileSize(att.file_size)}</p>
                )}
              </div>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          );
        })}
      </div>

      {lightboxUrl && (
        <ImageLightbox
          src={lightboxUrl.src}
          alt={lightboxUrl.alt}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </>
  );
}
