import { useMutation } from "@tanstack/react-query";
import type { Conversation } from "@/lib/store";

export type SyncChatsResult = {
  ok: boolean;
  synced: number;
  username?: string;
  creatorId?: string | null;
  conversations: Conversation[];
  message?: string;
  error?: string;
};

export function useSyncOnlyFansChats() {
  return useMutation({
    mutationFn: async (opts?: { limit?: number; filter?: "unread" | "recent" | "all" }) => {
      const res = await fetch("/api/onlyfans/sync-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: opts?.limit ?? 25,
          filter: opts?.filter ?? "recent",
        }),
      });
      const data = (await res.json()) as SyncChatsResult;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Chat-Sync fehlgeschlagen");
      return data;
    },
  });
}