import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Creator } from "@/lib/store";

async function fetchCreators(): Promise<Creator[]> {
  const res = await fetch("/api/creators");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Creators: ${res.status}`);
  }
  return res.json();
}

export function useCreators() {
  return useQuery({
    queryKey: ["creators"],
    queryFn: fetchCreators,
    staleTime: 30_000,
  });
}

export function useCreatorMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["creators"] });

  const create = useMutation({
    mutationFn: async (data: Omit<Creator, "id" | "trend"> & { trend?: number[] }) => {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erstellen fehlgeschlagen");
      }
      return res.json() as Promise<Creator>;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Creator> & { id: string }) => {
      const res = await fetch(`/api/creators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Speichern fehlgeschlagen");
      }
      return res.json() as Promise<Creator>;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/creators/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Löschen fehlgeschlagen");
      }
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}