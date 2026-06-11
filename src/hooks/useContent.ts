import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContentItem, ContentStatus } from "@/lib/store";

type ContentFilters = { creatorId?: string; status?: ContentStatus };

async function fetchContent(filters?: ContentFilters): Promise<ContentItem[]> {
  const params = new URLSearchParams();
  if (filters?.creatorId) params.set("creatorId", filters.creatorId);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  const res = await fetch(`/api/content${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Content: ${res.status}`);
  }
  return res.json();
}

export function useContent(filters?: ContentFilters) {
  return useQuery({
    queryKey: ["content", filters ?? {}],
    queryFn: () => fetchContent(filters),
    staleTime: 15_000,
  });
}

export function useContentMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["content"] });

  const create = useMutation({
    mutationFn: async (data: Omit<ContentItem, "id">) => {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Anlegen fehlgeschlagen");
      }
      return res.json() as Promise<ContentItem>;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ContentItem> & { id: string }) => {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Update fehlgeschlagen");
      }
      return res.json() as Promise<ContentItem>;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Löschen fehlgeschlagen");
      }
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}