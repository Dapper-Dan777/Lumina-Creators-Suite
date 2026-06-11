import { useMutation } from "@tanstack/react-query";
import type { Message } from "@/lib/store";

export function useSendOnlyFansMessage() {
  return useMutation({
    mutationFn: async (body: {
      chatId: string;
      text: string;
      creatorId?: string;
      price?: number;
    }) => {
      const res = await fetch("/api/onlyfans/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Senden fehlgeschlagen");
      return data as { message: Message; username?: string };
    },
  });
}