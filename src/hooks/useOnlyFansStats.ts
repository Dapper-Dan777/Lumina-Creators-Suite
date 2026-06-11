import { useQuery } from "@tanstack/react-query";

export type OnlyFansStats = {
  ok: boolean;
  connected: boolean;
  message?: string;
  pendingLink?: boolean;
  accountId?: string;
  username?: string;
  name?: string;
  subscribersCount?: number | null;
  postsCount?: number | null;
  chatMessagesCount?: number | null;
};

async function fetchStats(): Promise<OnlyFansStats> {
  const res = await fetch("/api/onlyfans/stats");
  const data = (await res.json()) as OnlyFansStats;
  if (!res.ok) throw new Error(data.message ?? `OnlyFans Stats: ${res.status}`);
  return data;
}

export function useOnlyFansStats() {
  return useQuery({
    queryKey: ["onlyfans-stats"],
    queryFn: fetchStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  });
}