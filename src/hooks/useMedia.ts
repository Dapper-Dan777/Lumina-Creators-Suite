import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MediaItem = {
  id: string;
  creatorId: string;
  folderId: string | null;
  filename: string;
  url: string;
  mimeType: string;
  category: string;
  title: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MediaFolder = {
  id: string;
  creatorId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { assets: number; children: number };
};

export type MediaCategory = { id: string; label: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error ?? `Fehler ${res.status}`);
  return data as T;
}

export function useMediaCategories() {
  return useQuery({
    queryKey: ["media-categories"],
    queryFn: () => api<{ categories: MediaCategory[] }>("/api/media/categories").then((d) => d.categories),
    staleTime: 300_000,
  });
}

export function useMediaFolders(filters?: { creatorId?: string; parentId?: string | "root" }) {
  const params = new URLSearchParams();
  if (filters?.creatorId) params.set("creatorId", filters.creatorId);
  if (filters?.parentId) params.set("parentId", filters.parentId);
  const qs = params.toString();

  return useQuery({
    queryKey: ["media-folders", filters ?? {}],
    queryFn: () => api<{ folders: MediaFolder[] }>(`/api/media/folders${qs ? `?${qs}` : ""}`).then((d) => d.folders),
    staleTime: 10_000,
    enabled: Boolean(filters?.creatorId),
  });
}

export function useMedia(filters?: { creatorId?: string; category?: string; folderId?: string | "root"; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.creatorId) params.set("creatorId", filters.creatorId);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.folderId) params.set("folderId", filters.folderId);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();

  return useQuery({
    queryKey: ["media", filters ?? {}],
    queryFn: () => api<{ items: MediaItem[] }>(`/api/media${qs ? `?${qs}` : ""}`).then((d) => d.items),
    staleTime: 10_000,
  });
}

export function useMediaMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["media"] });
    qc.invalidateQueries({ queryKey: ["media-folders"] });
  };

  const upload = useMutation({
    mutationFn: (body: {
      creatorId: string;
      dataUrl: string;
      filename: string;
      category?: string;
      title?: string;
      folderId?: string | null;
    }) =>
      api<{ item: MediaItem }>("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((d) => d.item),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; title?: string; category?: string; folderId?: string | null }) =>
      api<{ item: MediaItem }>(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((d) => d.item),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/api/media/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const createFolder = useMutation({
    mutationFn: (body: { creatorId: string; name: string; parentId?: string | null }) =>
      api<{ folder: MediaFolder }>("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((d) => d.folder),
    onSuccess: invalidate,
  });

  const updateFolder = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; parentId?: string | null }) =>
      api<{ folder: MediaFolder }>(`/api/media/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((d) => d.folder),
    onSuccess: invalidate,
  });

  const removeFolder = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/api/media/folders/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return { upload, update, remove, createFolder, updateFolder, removeFolder };
}