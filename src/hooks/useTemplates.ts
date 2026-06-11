import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useContentTemplates() {
  return useQuery({
    queryKey: ["content-templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Templates laden fehlgeschlagen");
      return data.templates as { niche: string; postCount: number; ppvCount: number; storyCount: number; total: number }[];
    },
    staleTime: 120_000,
  });
}

export function useApplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ niche, creatorId }: { niche: string; creatorId: string }) => {
      const res = await fetch("/api/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, creatorId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Template fehlgeschlagen");
      return data as { message: string; created: unknown[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
  });
}