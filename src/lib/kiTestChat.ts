import type { Conversation } from "@/lib/store";

export const KI_TEST_CHAT_ID = "ki-test-chat";

export function createKiTestChat(creatorId: string): Conversation {
  return {
    id: KI_TEST_CHAT_ID,
    creatorId,
    fan: "Test-Fan (KI)",
    fanHandle: "@ki_test_fan",
    channel: "DM",
    unread: 0,
    pinned: true,
    spend: 120,
    messages: [
      {
        id: "ki-1",
        from: "fan",
        text: "Hey love 💕 hast du heute was Neues für mich? Ich würde gerne mehr von dir sehen!",
        time: "14:32",
      },
      {
        id: "ki-2",
        from: "fan",
        text: "Und was kostet das PPV diesmal? 😘",
        time: "14:33",
      },
    ],
  };
}