export function proxyOfMedia(url: string) {
  if (!url) return url;
  if (url.startsWith("/api/")) return url;
  return `/api/onlyfans/media-proxy?url=${encodeURIComponent(url)}`;
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}