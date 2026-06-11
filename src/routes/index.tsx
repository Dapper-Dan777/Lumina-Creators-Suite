import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, Stat, Badge, Btn, Modal, Field, Input, Select, ErrorState } from "@/components/AppShell";
import { CreatorAvatar } from "@/components/CreatorAvatar";
import { useCreators } from "@/hooks/useCreators";
import { useOnlyFansStats } from "@/hooks/useOnlyFansStats";
import { useNotifications } from "@/hooks/useNotifications";
import { useStore, eur, fmt, timeAgo } from "@/lib/store";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { AlertTriangle, TrendingUp, CheckCircle2, FileWarning, Plus, X, Check, Circle, Loader2, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dashboard · Lumina Manage" },
    { name: "description", content: "Dashboard: Überblick über Creator, Revenue, Tasks und Alerts in Lumina Manage." },
    { property: "og:title", content: "Dashboard · Lumina Manage" },
    { property: "og:description", content: "Dashboard: Überblick über Creator, Revenue, Tasks und Alerts in Lumina Manage." },
    { property: "og:url", content: "/" },
  ], links: [{ rel: "canonical", href: "/" }] }),
  component: Dashboard,
});

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul"];

function Dashboard() {
  const { data: creators = [], isLoading: creatorsLoading, isError: creatorsError, error: creatorsLoadError, refetch: refetchCreators } = useCreators();
  const { data: ofStats } = useOnlyFansStats();
  const tasks = useStore((s) => s.tasks);
  const { alerts, dismissAlert } = useNotifications();
  const activity = useStore((s) => s.activity);
  const toggleTask = useStore((s) => s.toggleTask);
  const removeTask = useStore((s) => s.removeTask);
  const addTask = useStore((s) => s.addTask);

  const [addOpen, setAddOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCreator, setTaskCreator] = useState<string>("");
  const [taskPriority, setTaskPriority] = useState<"low" | "med" | "high">("med");

  const totalRevenue = useMemo(() => creators.reduce((s, c) => s + c.monthlyRevenue, 0), [creators]);
  const totalSubs = useMemo(() => creators.reduce((s, c) => s + c.subscribers, 0), [creators]);
  const liveSubs = ofStats?.connected && ofStats.subscribersCount != null
    ? ofStats.subscribersCount
    : null;
  const activeCreators = creators.filter((c) => c.status === "active").length;
  const onboardingCount = creators.filter((c) => c.status === "onboarding").length;
  const avgShare = creators.length
    ? Math.round(creators.reduce((s, c) => s + (100 - c.revenueShare), 0) / creators.length)
    : 0;

  const trend = useMemo(() => {
    if (!creators.length) return [];
    return MONTHS.map((month, i) => ({
      month,
      revenue: creators.reduce((s, c) => s + (c.trend?.[i] ?? 0), 0),
    }));
  }, [creators]);

  const top = [...creators].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 5);

  const openTasks = tasks.filter((t) => !t.done).length;
  const doneTasks = tasks.filter((t) => t.done).length;

  const alertIcon = (t: string) =>
    t === "approval" ? CheckCircle2 : t === "goal" ? TrendingUp : t === "contract" ? FileWarning : AlertTriangle;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Übersicht über deine gesamte Agency-Performance"
      actions={
        <Btn variant="brand" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Neue Aufgabe</Btn>
      }
    >
      {creatorsLoading ? (
        <Card className="mb-5 p-8 grid place-items-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </Card>
      ) : creatorsError ? (
        <ErrorState
          title="Creator-Daten nicht geladen"
          message={creatorsLoadError instanceof Error ? creatorsLoadError.message : "API nicht erreichbar"}
          onRetry={() => refetchCreators()}
        />
      ) : (
        <>
          {ofStats && (
            <Card className={`mb-5 p-4 border ${ofStats.connected ? "border-success/30 bg-success/[0.06]" : "border-warning/30 bg-warning/[0.06]"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Radio className={`size-4 ${ofStats.connected ? "text-success" : "text-amber-500"}`} />
                  <div>
                    <div className="text-sm font-medium">
                      {ofStats.connected
                        ? `OnlyFansAPI live: @${ofStats.username ?? "—"}`
                        : ofStats.pendingLink
                          ? "OnlyFans-Account wird bei onlyfansapi.com verbunden…"
                          : "OnlyFansAPI — noch nicht verbunden"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ofStats.connected
                        ? `${fmt(ofStats.subscribersCount ?? 0)} Subscribers · ${ofStats.postsCount ?? 0} Posts`
                        : (ofStats.message ?? "Verbinde deinen Account unter app.onlyfansapi.com")}
                    </div>
                  </div>
                </div>
                {ofStats.connected && (
                  <Badge tone="success">Live Sync</Badge>
                )}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-6">
            <Stat
              label="Monats-Revenue"
              value={eur(totalRevenue)}
              delta={creators.length ? "aus Creator-Daten" : "Noch keine Creator"}
              accent="magenta"
            />
            <Stat
              label="Subscribers"
              value={fmt(liveSubs ?? totalSubs)}
              delta={liveSubs != null ? "live via OnlyFansAPI" : creators.length ? "aus Creator-Daten" : "—"}
              accent="cyan"
            />
            <Stat
              label="Aktive Creator"
              value={creators.length ? `${activeCreators}/${creators.length}` : "0"}
              delta={onboardingCount > 0 ? `${onboardingCount} im Onboarding` : creators.length ? "alle aktiv" : "Creator anlegen"}
              accent="success"
            />
            <Stat
              label="Agency Cut"
              value={eur(Math.round(totalRevenue * (avgShare / 100)))}
              delta={creators.length ? `Ø ${avgShare}% Share` : "—"}
              accent="warning"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 lg:mb-6">
        <Card className="lg:col-span-2 p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-base lg:text-lg">Revenue Trend</h2>
              <p className="text-xs text-muted-foreground">Letzte 6 Monate</p>
            </div>
            {trend.length > 0 && totalRevenue > 0 && (
              <Badge tone="magenta">{eur(totalRevenue)} gesamt</Badge>
            )}
          </div>
          {trend.length === 0 || totalRevenue === 0 ? (
            <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
              Noch keine Revenue-Daten — Creator anlegen oder OnlyFansAPI verbinden
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.28 340)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.68 0.28 340)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="oklch(0.55 0.02 270)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "oklch(0.2 0.014 280)", border: "1px solid oklch(0.28 0.018 280)", borderRadius: 12 }}
                labelStyle={{ color: "oklch(0.97 0 0)" }}
                formatter={(v: number) => eur(v)}
              />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.68 0.28 340)" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-base lg:text-lg">Alerts</h2>
            <Badge tone="danger">{alerts.length}</Badge>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto -mx-2 px-2">
            {alerts.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">Keine offenen Alerts 🎉</div>}
            {alerts.map((a) => {
              const Icon = alertIcon(a.type);
              const tone = a.severity === "high" ? "danger" : a.severity === "medium" ? "warning" : "info";
              return (
                <div key={a.id} className="group flex gap-3 p-3 rounded-lg bg-elevated/60 border border-border hover:border-primary/40 transition">
                  <div className={`size-8 shrink-0 rounded-lg grid place-items-center ${tone === "danger" ? "bg-destructive/15 text-destructive" : tone === "warning" ? "bg-warning/15 text-warning" : "bg-cyan/15 text-cyan"}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</div>
                  </div>
                  <button onClick={() => { dismissAlert(a.id); toast.success("Alert erledigt"); }}
                    className="opacity-0 group-hover:opacity-100 size-7 grid place-items-center rounded hover:bg-elevated transition" aria-label="Dismiss">
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base lg:text-lg">Top Creator</h2>
            <Link to="/creators" className="text-xs text-primary hover:underline">Alle →</Link>
          </div>
          <div className="space-y-1">
            {top.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center">Noch keine Creator — starte mit Onboarding</div>
            )}
            {top.map((c, i) => {
              const pct = c.monthlyGoal ? Math.min(100, Math.round((c.monthlyRevenue / c.monthlyGoal) * 100)) : 0;
              return (
                <Link key={c.id} to="/creators" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-elevated/60 transition">
                  <div className="text-xs font-bold w-5 text-muted-foreground">#{i + 1}</div>
                  <CreatorAvatar src={c.avatar} name={c.name} className="size-9 lg:size-10" rounded="full" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm truncate">{c.name}</div>
                      <Badge tone="info">{c.niche.split(" ")[0]}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{c.handle} · {fmt(c.subscribers)} subs</div>
                  </div>
                  <div className="hidden sm:block w-24 lg:w-32">
                    <div className="text-[10px] text-muted-foreground mb-1 flex justify-between">
                      <span>{pct}%</span><span>Ziel</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right w-20 lg:w-28 shrink-0">
                    <div className="font-display font-bold text-sm lg:text-base">{eur(c.monthlyRevenue)}</div>
                    <div className={`text-[10px] lg:text-xs ${c.growth >= 0 ? "text-success" : "text-destructive"}`}>
                      {c.growth >= 0 ? "+" : ""}{c.growth}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-base lg:text-lg">Tasks</h2>
            <span className="text-xs text-muted-foreground">{doneTasks}/{tasks.length} erledigt</span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-2 px-2">
            {tasks.map((t) => (
              <div key={t.id} className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-elevated/60 transition">
                <button onClick={() => { toggleTask(t.id); toast.success(t.done ? "Wieder offen" : "Erledigt ✓"); }} className="mt-0.5 shrink-0" aria-label="Toggle">
                  {t.done
                    ? <CheckCircle2 className="size-5 text-success" />
                    : <Circle className="size-5 text-muted-foreground hover:text-primary transition" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  {t.due && <div className="text-[10px] text-muted-foreground mt-0.5">📅 {t.due}</div>}
                </div>
                <Badge tone={t.priority === "high" ? "danger" : t.priority === "med" ? "warning" : "info"}>{t.priority}</Badge>
                <button onClick={() => { removeTask(t.id); toast("Task gelöscht"); }} className="opacity-0 group-hover:opacity-100 size-6 grid place-items-center rounded hover:bg-elevated" aria-label="Löschen">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Btn variant="outline" size="sm" className="w-full mt-3" onClick={() => setAddOpen(true)}><Plus className="size-3.5" /> Task hinzufügen</Btn>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">Offene Tasks: {openTasks}</div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-brand transition-all" style={{ width: `${tasks.length ? (doneTasks/tasks.length)*100 : 0}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 lg:p-6 mt-4 lg:mt-6">
        <h2 className="font-display font-semibold text-base lg:text-lg mb-4">Activity Log</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {activity.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 col-span-full text-center">Noch keine Aktivitäten</div>
          )}
          {activity.slice(0, 8).map((l) => (
            <div key={l.id} className="flex gap-3 text-sm">
              <div className="size-2 mt-1.5 rounded-full bg-cyan shrink-0" />
              <div className="min-w-0">
                <div className="leading-tight">
                  <span className="font-medium">{l.actor}</span>{" "}
                  <span className="text-muted-foreground">{l.action}</span>{" "}
                  <span className="font-medium text-primary">{l.target}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{timeAgo(l.time)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Neue Aufgabe"
        footer={<>
          <Btn variant="outline" onClick={() => setAddOpen(false)}>Abbrechen</Btn>
          <Btn variant="brand" onClick={() => {
            if (!taskTitle.trim()) return toast.error("Titel fehlt");
            addTask({ title: taskTitle, creatorId: taskCreator || undefined, priority: taskPriority });
            toast.success("Task hinzugefügt");
            setAddOpen(false); setTaskTitle(""); setTaskCreator(""); setTaskPriority("med");
          }}><Check className="size-4" /> Erstellen</Btn>
        </>}>
        <div className="space-y-4">
          <Field label="Titel"><Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="z.B. Strategy-Call mit …" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Creator (optional)">
              <Select value={taskCreator} onChange={(e) => setTaskCreator(e.target.value)}>
                <option value="">— keiner —</option>
                {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Priorität">
              <Select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as "low" | "med" | "high")}>
                <option value="low">Niedrig</option>
                <option value="med">Mittel</option>
                <option value="high">Hoch</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
