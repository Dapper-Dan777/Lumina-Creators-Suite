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
};

export type Message = {
  id: string;
  from: "fan" | "creator" | "ai";
  text: string;
  time: string;
};
export type Conversation = {
  id: string;
  creatorId: string;
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
};

export type Integrations = {
  providerId: "ofapi" | "ofauth" | "custom";
  baseUrl: string;
  apiKey: string;
  webhookUrl: string;
  connected: boolean;
};

// ───────── seed ─────────
const avatarColors = ["#ec4899", "#22d3ee", "#f59e0b", "#a855f7", "#10b981", "#f43f5e"];
const avatar = (i: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='${avatarColors[i % 6]}'/><stop offset='1' stop-color='#1a1530'/></linearGradient></defs><rect width='64' height='64' rx='32' fill='url(%23g)'/></svg>`
  )}`;

const seedCreators: Creator[] = [
  { id: "c1", name: "Aria Lux", handle: "@arialux", avatar: avatar(0), niche: "Fashion & Lifestyle", status: "active", revenueShare: 70, monthlyRevenue: 48230, monthlyGoal: 50000, subscribers: 12480, growth: 12.4, team: ["t1","t2"], joinedAt: "2024-03-12", contractEndsAt: "2026-09-01", notes: "Top performer. Push PPV bundles in Q4.", trend: [22,28,31,35,33,41,48] },
  { id: "c2", name: "Nova Sky", handle: "@novasky", avatar: avatar(1), niche: "Fitness", status: "active", revenueShare: 65, monthlyRevenue: 31200, monthlyGoal: 35000, subscribers: 8920, growth: 8.1, team: ["t3"], joinedAt: "2024-06-01", contractEndsAt: "2026-06-01", notes: "Strong engagement, improve renewal flow.", trend: [18,21,25,27,29,30,31] },
  { id: "c3", name: "Mila Rose", handle: "@milarose", avatar: avatar(2), niche: "Cosplay", status: "active", revenueShare: 75, monthlyRevenue: 62450, monthlyGoal: 60000, subscribers: 18340, growth: 18.7, team: ["t1","t4","t2"], joinedAt: "2023-11-20", contractEndsAt: "2025-12-15", notes: "Contract renewal upcoming!", trend: [40,44,48,52,55,58,62] },
  { id: "c4", name: "Zoe Vex", handle: "@zoevex", avatar: avatar(3), niche: "Alt / Gothic", status: "active", revenueShare: 70, monthlyRevenue: 18900, monthlyGoal: 25000, subscribers: 5410, growth: -4.2, team: ["t3"], joinedAt: "2025-01-08", contractEndsAt: "2027-01-08", notes: "Underperforming. Schedule strategy call.", trend: [24,22,21,20,19,19,18] },
  { id: "c5", name: "Luna Belle", handle: "@lunabelle", avatar: avatar(4), niche: "Glamour", status: "active", revenueShare: 68, monthlyRevenue: 27800, monthlyGoal: 30000, subscribers: 7650, growth: 5.6, team: ["t4"], joinedAt: "2024-09-15", contractEndsAt: "2026-09-15", notes: "Solid growth, ready for tier expansion.", trend: [20,22,24,25,26,27,27] },
  { id: "c6", name: "Ember Knox", handle: "@emberknox", avatar: avatar(5), niche: "Gaming", status: "onboarding", revenueShare: 70, monthlyRevenue: 0, monthlyGoal: 15000, subscribers: 0, growth: 0, team: ["t2"], joinedAt: "2026-05-20", contractEndsAt: "2028-05-20", notes: "Launching next week. Brand kit pending.", trend: [0,0,0,0,0,0,0] },
];

const seedTeam: TeamMember[] = [
  { id: "t1", name: "Sarah Meyer", email: "sarah@lumina.io", role: "Manager", creators: ["c1","c3"], avatar: avatar(0), online: true },
  { id: "t2", name: "Tom Krause", email: "tom@lumina.io", role: "Editor", creators: ["c1","c3","c6"], avatar: avatar(1), online: true },
  { id: "t3", name: "Jess Rivera", email: "jess@lumina.io", role: "Chatter", creators: ["c2","c4"], avatar: avatar(2), online: false },
  { id: "t4", name: "Alex Patel", email: "alex@lumina.io", role: "VA", creators: ["c3","c5"], avatar: avatar(3), online: true },
];

const now = Date.now();
const seedTasks: Task[] = [
  { id: "tk1", title: "Vertrag Mila Rose verlängern", done: false, due: "2026-06-08", creatorId: "c3", priority: "high" },
  { id: "tk2", title: "Strategy-Call mit Zoe Vex", done: false, due: "2026-06-05", creatorId: "c4", priority: "high" },
  { id: "tk3", title: "Approval Queue durchgehen", done: false, due: "2026-06-03", priority: "med" },
  { id: "tk4", title: "Ember Knox Launch-Kit finalisieren", done: false, due: "2026-06-06", creatorId: "c6", priority: "med" },
  { id: "tk5", title: "Mai-Payouts auslösen", done: true, creatorId: undefined, priority: "high" },
  { id: "tk6", title: "Q2 Performance Report exportieren", done: false, due: "2026-06-10", priority: "low" },
];

const dayOffset = (d: number) => new Date(now + d * 86400000).toISOString();
const seedContent: ContentItem[] = [
  { id: "q1", creatorId: "c1", title: "Beach photoshoot — set #4", type: "PPV", status: "pending", scheduledFor: dayOffset(0), price: 25, cover: "linear-gradient(135deg,#ec4899,#f97316)" },
  { id: "q2", creatorId: "c3", title: "Sailor Moon cosplay reveal", type: "Post", status: "approved", scheduledFor: dayOffset(1), cover: "linear-gradient(135deg,#a855f7,#22d3ee)" },
  { id: "q3", creatorId: "c2", title: "Gym routine BTS", type: "Video", status: "pending", scheduledFor: dayOffset(2), cover: "linear-gradient(135deg,#10b981,#22d3ee)" },
  { id: "q4", creatorId: "c5", title: "Lingerie haul try-on", type: "PPV", status: "draft", scheduledFor: dayOffset(3), price: 18, cover: "linear-gradient(135deg,#f43f5e,#a855f7)" },
  { id: "q5", creatorId: "c4", title: "Gothic Halloween teaser", type: "Post", status: "approved", scheduledFor: dayOffset(4), cover: "linear-gradient(135deg,#6366f1,#ec4899)" },
  { id: "q6", creatorId: "c1", title: "Morning routine vlog", type: "Video", status: "scheduled", scheduledFor: dayOffset(5), cover: "linear-gradient(135deg,#f59e0b,#ec4899)" },
  { id: "q7", creatorId: "c3", title: "Discord Q&A teaser", type: "Story", status: "draft", scheduledFor: dayOffset(2), cover: "linear-gradient(135deg,#22d3ee,#a855f7)" },
  { id: "q8", creatorId: "c2", title: "Protein-Shake recipe", type: "Post", status: "scheduled", scheduledFor: dayOffset(6), cover: "linear-gradient(135deg,#10b981,#f59e0b)" },
];

const seedConversations: Conversation[] = [
  { id: "m1", creatorId: "c1", fan: "Big Tipper", fanHandle: "@bigtipper99", channel: "DM", unread: 2, spend: 1240, pinned: true, messages: [
    { id: "1", from: "fan", text: "Hey love, got anything new today? 💕", time: "10:32" },
    { id: "2", from: "creator", text: "Hey babe! Ja, frisches Set ist gerade live 😘", time: "10:34" },
    { id: "3", from: "fan", text: "Show me!", time: "10:35" },
  ]},
  { id: "m2", creatorId: "c3", fan: "Otaku King", fanHandle: "@otaku_king", channel: "DM", unread: 1, spend: 890, messages: [
    { id: "1", from: "fan", text: "That last cosplay was insane!! when's the next?", time: "09:12" },
  ]},
  { id: "m3", creatorId: "c2", fan: "Gym Rat", fanHandle: "@gymrat", channel: "PPV", unread: 0, spend: 420, messages: [
    { id: "1", from: "fan", text: "Bought the bundle, can't wait 🔥", time: "Gestern" },
    { id: "2", from: "creator", text: "Enjoy! Mehr coming soon", time: "Gestern" },
  ]},
  { id: "m4", creatorId: "c5", fan: "Night Owl", fanHandle: "@nightowl", channel: "DM", unread: 0, spend: 210, messages: [
    { id: "1", from: "fan", text: "Auto-renew aktiviert, danke!", time: "vor 32 Min" },
  ]},
  { id: "m5", creatorId: "c4", fan: "Dark Romance", fanHandle: "@darkromance", channel: "DM", unread: 3, spend: 680, messages: [
    { id: "1", from: "fan", text: "Loving the new aesthetic 🖤", time: "08:00" },
    { id: "2", from: "fan", text: "When's the next drop?", time: "08:02" },
    { id: "3", from: "fan", text: "I'd pay double for the unreleased set", time: "08:05" },
  ]},
  { id: "m6", creatorId: "c1", fan: "Whale Hunter", fanHandle: "@whalehunter", channel: "DM", unread: 0, spend: 3200, messages: [
    { id: "1", from: "fan", text: "Custom video request?", time: "vor 3 Std" },
  ]},
];

const seedPayouts: Payout[] = seedCreators
  .filter((c) => c.monthlyRevenue > 0)
  .map((c, i) => ({
    id: `p${i+1}`,
    creatorId: c.id,
    gross: c.monthlyRevenue,
    date: "01.06.2026",
    method: (["SEPA","SEPA","PayPal","SEPA","Crypto"] as const)[i] ?? "SEPA",
    status: i % 2 === 0 ? "paid" : "scheduled",
  }));

const seedActivity: Activity[] = [
  { id: "l1", actor: "Sarah M.", action: "PPV approved von", target: "Mila Rose", time: now - 5*60000 },
  { id: "l2", actor: "Tom K.", action: "Post geplant für", target: "Aria Lux", time: now - 22*60000 },
  { id: "l3", actor: "Jess R.", action: "AI-Chatter aktiviert für", target: "Nova Sky", time: now - 60*60000 },
  { id: "l4", actor: "Alex P.", action: "Vertrag aktualisiert:", target: "Luna Belle", time: now - 3*3600000 },
  { id: "l5", actor: "Sarah M.", action: "Onboarding gestartet für", target: "Ember Knox", time: now - 26*3600000 },
];

const seedAlerts: AlertItem[] = [
  { id: "a1", type: "approval", severity: "medium", title: "4 Content-Items warten auf Approval", description: "Aria Lux, Mila Rose, Luna Belle" },
  { id: "a2", type: "goal", severity: "high", title: "Zoe Vex 24% unter Monatsziel", description: "Aktuell 18.900 € / Ziel 25.000 €", creatorId: "c4" },
  { id: "a3", type: "contract", severity: "high", title: "Vertrag Mila Rose läuft in 2 Wochen ab", description: "Renewal-Gespräch planen", creatorId: "c3" },
  { id: "a4", type: "risk", severity: "medium", title: "Churn-Anstieg bei Nova Sky", description: "Renewal-Rate -6% diese Woche", creatorId: "c2" },
  { id: "a5", type: "approval", severity: "low", title: "Onboarding-Checkliste Ember Knox", description: "3 von 8 Schritten offen", creatorId: "c6" },
];

type StoreState = {
  creators: Creator[];
  tasks: Task[];
  content: ContentItem[];
  conversations: Conversation[];
  payouts: Payout[];
  team: TeamMember[];
  activity: Activity[];
  alerts: AlertItem[];
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
  sendMessage: (convId: string, text: string, from?: "creator" | "ai" | "fan") => void;
  markRead: (convId: string) => void;

  // payouts
  setPayoutStatus: (id: string, status: Payout["status"]) => void;
  payAll: () => void;

  // team
  addTeamMember: (m: Omit<TeamMember, "id" | "avatar" | "online">) => void;
  updateTeamRole: (id: string, role: Role) => void;
  removeTeamMember: (id: string) => void;
  togglePerm: (role: Role, perm: string) => void;

  // alerts
  dismissAlert: (id: string) => void;

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
      creators: seedCreators,
      tasks: seedTasks,
      content: seedContent,
      conversations: seedConversations,
      payouts: seedPayouts,
      team: seedTeam,
      activity: seedActivity,
      alerts: seedAlerts,
      branding: { name: "Lumina Manage", primary: "#ec4899", accent: "#22d3ee", logoText: "Lumina" },
      integrations: { providerId: "ofapi", baseUrl: "https://api.onlyfansapi.com/v2", apiKey: "of_live_••••••••••••••••3f9a", webhookUrl: "https://app.luminamanage.com/api/public/of-webhook", connected: true },
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

      sendMessage: (convId, text, from = "creator") => set((s) => ({
        conversations: s.conversations.map((c) => c.id === convId
          ? { ...c, messages: [...c.messages, { id: `${Date.now()}`, from, text, time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) }] }
          : c)
      })),
      markRead: (convId) => set((s) => ({ conversations: s.conversations.map((c) => c.id === convId ? { ...c, unread: 0 } : c) })),

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

      dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

      setBranding: (b) => set((s) => ({ branding: { ...s.branding, ...b } })),
      setIntegrations: (i) => set((s) => ({ integrations: { ...s.integrations, ...i } })),

      log: (actor, action, target) => set((s) => ({
        activity: [{ id: `l${Date.now()}`, actor, action, target, time: Date.now() }, ...s.activity].slice(0, 50),
      })),
    }),
    { name: "lumina-store", version: 2 },
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
