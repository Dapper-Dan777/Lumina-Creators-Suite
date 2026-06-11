import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CreatorStatus = "active" | "onboarding" | "paused";
export type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  niche: string;
  status: CreatorStatus;
  revenueShare: number;
  monthlyRevenue: number;
  monthlyGoal: number;
  subscribers: number;
  growth: number;
  team: string[];
  joinedAt: string;
  contractEndsAt: string;
  notes: string;
  trend: number[];
  onlyfansUrl?: string;
  onlyfansAccountId?: string;
  onlyfansUsername?: string;
  headerUrl?: string;
  avatarSyncedAt?: string;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
  due?: string;
  creatorId?: string;
  priority: "low" | "med" | "high";
};

export type ContentStatus = "draft" | "pending" | "approved" | "scheduled" | "published";
export type ContentItem = {
  id: string;
  creatorId: string;
  title: string;
  type: "Post" | "PPV" | "Video" | "Story";
  status: ContentStatus;
  scheduledFor: string; // ISO
  price?: number;
  cover: string;
  caption?: string;
  publishedAt?: string;
};

export type ChatMedia = {
  url: string;
  thumbUrl?: string;
  type: "image" | "video";
  locked?: boolean;
  price?: number;
};

export type Message = {
  id: string;
  from: "fan" | "creator" | "ai";
  text: string;
  time: string;
  media?: ChatMedia[];
};

export type Conversation = {
  id: string;
  creatorId: string;
  ofChatId?: string;
  fan: string;
  fanHandle: string;
  channel: "DM" | "PPV" | "Mass";
  unread: number;
  pinned?: boolean;
  spend: number;
  messages: Message[];
};

export type Payout = {
  id: string;
  creatorId: string;
  gross: number;
  date: string;
  method: "SEPA" | "PayPal" | "Crypto";
  status: "paid" | "scheduled" | "hold";
};

export type Role = "Manager" | "Chatter" | "Editor" | "VA";
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  creators: string[];
  avatar: string;
  online: boolean;
};

export type Activity = {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: number; // epoch
};

export type AlertItem = {
  id: string;
  type: "approval" | "goal" | "risk" | "contract";
  title: string;
  description: string;
  creatorId?: string;
  severity: "low" | "medium" | "high";
  dismissed?: boolean;
};

export type Branding = {
  name: string;
  primary: string; // hex
  accent: string;
  logoText: string;
  logoUrl?: string;
  headerBgUrl?: string;
  profileImageUrl?: string;
};

export type Integrations = {
  providerId: "ofapi" | "ofauth" | "custom";
  baseUrl: string;
  apiKey: string;
  webhookUrl: string;
  connected: boolean;
};

const avatarColors = ["#ec4899", "#22d3ee", "#f59e0b", "#a855f7", "#10b981", "#f43f5e"];
const avatar = (i: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='${avatarColors[i % 6]}'/><stop offset='1' stop-color='#1a1530'/></linearGradient></defs><rect width='64' height='64' rx='32' fill='url(%23g)'/></svg>`
  )}`;

type StoreState = {
  creators: Creator[];
  tasks: Task[];
  content: ContentItem[];
  conversations: Conversation[];
  payouts: Payout[];
  team: TeamMember[];
  activity: Activity[];
  branding: Branding;
  integrations: Integrations;
  rolePerms: Record<Role, string[]>;

  // creator actions
  addCreator: (c: Omit<Creator, "id" | "trend">) => void;
  updateCreator: (id: string, patch: Partial<Creator>) => void;
  removeCreator: (id: string) => void;

  // tasks
  toggleTask: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "done">) => void;
  removeTask: (id: string) => void;

  // content
  moveContent: (id: string, status: ContentStatus) => void;
  addContent: (c: Omit<ContentItem, "id">) => void;
  removeContent: (id: string) => void;
  rescheduleContent: (id: string, iso: string) => void;

  // messaging
  addConversation: (c: Omit<Conversation, "id" | "messages" | "unread"> & { message: string }) => string;
  mergeConversations: (convs: Conversation[]) => void;
  sendMessage: (convId: string, text: string, from?: "creator" | "ai" | "fan") => void;
  markRead: (convId: string) => void;
  removeConversationsForCreator: (creatorId: string) => void;

  // payouts
  setPayoutStatus: (id: string, status: Payout["status"]) => void;
  payAll: () => void;

  // team
  addTeamMember: (m: Omit<TeamMember, "id" | "avatar" | "online">) => void;
  updateTeamRole: (id: string, role: Role) => void;
  removeTeamMember: (id: string) => void;
  togglePerm: (role: Role, perm: string) => void;

  // branding / integrations
  setBranding: (b: Partial<Branding>) => void;
  setIntegrations: (i: Partial<Integrations>) => void;

  log: (actor: string, action: string, target: string) => void;
};

const ALL_PERMS = [
  "Creator verwalten","Verträge bearbeiten","Payouts freigeben","Team einladen",
  "Messaging Hub","Mass Messages","Vorlagen nutzen",
  "Content hochladen","Content planen","Approval Queue",
  "Calendar","Notizen","Read-only Dashboard","Analytics einsehen",
];

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      creators: [],
      tasks: [],
      content: [],
      conversations: [],
      payouts: [],
      team: [],
      activity: [],
      branding: { name: "Lumina Manage", primary: "#ff2d8a", accent: "#00f0ff", logoText: "Lumina" },
      integrations: { providerId: "ofapi", baseUrl: "", apiKey: "", webhookUrl: "", connected: false },
      rolePerms: {
        Manager: ["Creator verwalten","Verträge bearbeiten","Payouts freigeben","Team einladen","Analytics einsehen"],
        Chatter: ["Messaging Hub","Mass Messages","Vorlagen nutzen"],
        Editor: ["Content hochladen","Content planen","Approval Queue"],
        VA: ["Calendar","Notizen","Read-only Dashboard"],
      },

      addCreator: (c) => {
        const id = `c${Date.now()}`;
        set((s) => ({ creators: [...s.creators, { ...c, id, trend: [0,0,0,0,0,0,0] }] }));
        get().log("Du", "Creator angelegt:", c.name);
      },
      updateCreator: (id, patch) => set((s) => ({ creators: s.creators.map((c) => c.id === id ? { ...c, ...patch } : c) })),
      removeCreator: (id) => set((s) => ({ creators: s.creators.filter((c) => c.id !== id) })),

      toggleTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) })),
      addTask: (t) => set((s) => ({ tasks: [{ ...t, id: `tk${Date.now()}`, done: false }, ...s.tasks] })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      moveContent: (id, status) => {
        set((s) => ({ content: s.content.map((c) => c.id === id ? { ...c, status } : c) }));
        const item = get().content.find((c) => c.id === id);
        if (item) get().log("Du", `Status → ${status}:`, item.title);
      },
      addContent: (c) => set((s) => ({ content: [{ ...c, id: `q${Date.now()}` }, ...s.content] })),
      removeContent: (id) => set((s) => ({ content: s.content.filter((c) => c.id !== id) })),
      rescheduleContent: (id, iso) => set((s) => ({ content: s.content.map((c) => c.id === id ? { ...c, scheduledFor: iso } : c) })),

      addConversation: (c) => {
        const id = `m${Date.now()}`;
        const time = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        set((s) => ({
          conversations: [{
            id,
            creatorId: c.creatorId,
            fan: c.fan,
            fanHandle: c.fanHandle,
            channel: c.channel,
            spend: c.spend,
            pinned: c.pinned,
            unread: 1,
            messages: [{ id: "1", from: "fan", text: c.message, time }],
          }, ...s.conversations],
        }));
        return id;
      },
      mergeConversations: (incoming) => set((s) => {
        const byId = new Map(s.conversations.map((c) => [c.id, c]));
        for (const c of incoming) byId.set(c.id, c);
        return { conversations: Array.from(byId.values()) };
      }),
      sendMessage: (convId, text, from = "creator") => set((s) => ({
        conversations: s.conversations.map((c) => c.id === convId
          ? { ...c, messages: [...c.messages, { id: `${Date.now()}`, from, text, time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) }] }
          : c)
      })),
      markRead: (convId) => set((s) => ({ conversations: s.conversations.map((c) => c.id === convId ? { ...c, unread: 0 } : c) })),
      removeConversationsForCreator: (creatorId) => set((s) => ({
        conversations: s.conversations.filter((c) => c.creatorId !== creatorId || c.id === "ki-test-chat"),
      })),

      setPayoutStatus: (id, status) => set((s) => ({ payouts: s.payouts.map((p) => p.id === id ? { ...p, status } : p) })),
      payAll: () => set((s) => ({ payouts: s.payouts.map((p) => ({ ...p, status: "paid" })) })),

      addTeamMember: (m) => {
        const id = `t${Date.now()}`;
        set((s) => ({ team: [...s.team, { ...m, id, avatar: avatar(s.team.length), online: true }] }));
      },
      updateTeamRole: (id, role) => set((s) => ({ team: s.team.map((m) => m.id === id ? { ...m, role } : m) })),
      removeTeamMember: (id) => set((s) => ({ team: s.team.filter((m) => m.id !== id) })),
      togglePerm: (role, perm) => set((s) => {
        const cur = s.rolePerms[role];
        const next = cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm];
        return { rolePerms: { ...s.rolePerms, [role]: next } };
      }),

      setBranding: (b) => set((s) => ({ branding: { ...s.branding, ...b } })),
      setIntegrations: (i) => set((s) => ({ integrations: { ...s.integrations, ...i } })),

      log: (actor, action, target) => set((s) => ({
        activity: [{ id: `l${Date.now()}`, actor, action, target, time: Date.now() }, ...s.activity].slice(0, 50),
      })),
    }),
    {
      name: "lumina-store",
      version: 7,
      // Creators + Content live in Postgres — not localStorage
      partialize: (s) => ({
        tasks: s.tasks,
        conversations: s.conversations,
        payouts: s.payouts,
        team: s.team,
        activity: s.activity,
        branding: s.branding,
        integrations: { ...s.integrations, apiKey: "", baseUrl: "" },
        rolePerms: s.rolePerms,
      }),
      migrate: (persisted, fromVersion) => {
        const base = persisted && typeof persisted === "object" ? persisted : {};
        let next = base;
        if (fromVersion < 5) {
          next = {
            ...next,
            tasks: [],
            conversations: [],
            payouts: [],
            team: [],
            activity: [],
          };
        }
        if (fromVersion < 6) {
          const b = next.branding as Branding | undefined;
          const legacy = b?.primary === "#ec4899" && b?.accent === "#22d3ee";
          if (legacy || !b?.primary) {
            next = {
              ...next,
              branding: {
                name: b?.name ?? "Lumina Manage",
                logoText: b?.logoText ?? "Lumina",
                primary: "#ff2d8a",
                accent: "#00f0ff",
              },
            };
          }
        }
        if (fromVersion < 7) {
          const b = next.branding as Branding | undefined;
          next = {
            ...next,
            branding: { ...b, logoUrl: b?.logoUrl, headerBgUrl: b?.headerBgUrl, profileImageUrl: b?.profileImageUrl },
          };
        }
        return next;
      },
    },
  ),
);

export const ALL_PERMISSIONS = ALL_PERMS;

export const eur = (n: number) => `€ ${Math.round(n).toLocaleString("de-DE")}`;
export const fmt = (n: number) => n.toLocaleString("de-DE");

export const niches = ["Fashion & Lifestyle","Fitness","Cosplay","Gaming","Glamour","Alt / Gothic"];

export function timeAgo(t: number): string {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `vor ${s}s`;
  if (s < 3600) return `vor ${Math.floor(s/60)} Min`;
  if (s < 86400) return `vor ${Math.floor(s/3600)} Std`;
  return `vor ${Math.floor(s/86400)} Tagen`;
}
