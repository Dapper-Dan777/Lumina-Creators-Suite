import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Modal, Field, Input, Select, Textarea, ErrorState, EmptyState } from "@/components/AppShell";
import { CreatorAvatar } from "@/components/CreatorAvatar";
import { MediaLibraryPanel } from "@/components/MediaLibraryPanel";
import { useCreators, useCreatorMutations } from "@/hooks/useCreators";
import { useOnlyFansStats } from "@/hooks/useOnlyFansStats";
import { useAiOnboarding, useAiPpvCopy, useAiRenewal, useAiStatus } from "@/hooks/useAi";
import { useStore, eur, niches, type Creator } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { onlyFansProfileUrl } from "@/lib/onlyfans";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, TrendingUp, TrendingDown, Target, Users2, Search, ArrowUpDown, Trash2, Check, Loader2, ExternalLink, RefreshCw, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/creators")({
  head: () => ({ meta: [
    { title: "Creators · Lumina Manage" },
    { name: "description", content: "Verwalte Creator, Onboarding, Ziele und Team in Lumina Manage." },
    { property: "og:title", content: "Creators · Lumina Manage" },
    { property: "og:description", content: "Verwalte Creator, Onboarding, Ziele und Team in Lumina Manage." },
    { property: "og:url", content: "/creators" },
  ], links: [{ rel: "canonical", href: "/creators" }] }),
  component: CreatorsPage,
});

type SortKey = "name" | "monthlyRevenue" | "subscribers" | "growth";

function CreatorsPage() {
  const { data: creators = [], isLoading, isError, error, refetch } = useCreators();
  const { create, update, remove } = useCreatorMutations();
  const { data: ofStats } = useOnlyFansStats();
  const qc = useQueryClient();
  const team = useStore((s) => s.team);
  const removeConversationsForCreator = useStore((s) => s.removeConversationsForCreator);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const [q, setQ] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("monthlyRevenue");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const filtered = useMemo(() => {
    let arr = creators.filter((c) =>
      (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.handle.toLowerCase().includes(q.toLowerCase())) &&
      (!nicheFilter || c.niche === nicheFilter) &&
      (!statusFilter || c.status === statusFilter));
    arr = arr.sort((a, b) => {
      const av = a[sort]; const bv = b[sort];
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * sortDir;
      return ((av as number) - (bv as number)) * sortDir;
    });
    return arr;
  }, [creators, q, nicheFilter, statusFilter, sort, sortDir]);

  const creator = creators.find((c) => c.id === selected);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setSortDir(sortDir === 1 ? -1 : 1);
    else { setSort(k); setSortDir(-1); }
  };

  const syncFromOnlyFans = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/onlyfans/sync-creators", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Sync fehlgeschlagen");
      await qc.invalidateQueries({ queryKey: ["creators"] });
      await qc.invalidateQueries({ queryKey: ["onlyfans-stats"] });
      toast.success(data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync fehlgeschlagen");
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Creators" subtitle="Lade…">
        <Card className="p-12 grid place-items-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
        </Card>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Creators" subtitle="Fehler">
        <ErrorState
          title="Creator-Daten nicht geladen"
          message={error instanceof Error ? error.message : "API nicht erreichbar"}
          onRetry={() => refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Creators"
      subtitle={`${filtered.length} von ${creators.length} Creator${filtered.length !== 1 ? "n" : ""}`}
      actions={
        <>
          <div className="hidden sm:flex rounded-lg border border-border bg-elevated p-1">
            <button onClick={() => setView("grid")} aria-label="Grid" className={`size-8 grid place-items-center rounded ${view === "grid" ? "bg-secondary" : ""}`}><LayoutGrid className="size-4" /></button>
            <button onClick={() => setView("list")} aria-label="List" className={`size-8 grid place-items-center rounded ${view === "list" ? "bg-secondary" : ""}`}><List className="size-4" /></button>
          </div>
          {ofStats?.connected && (
            <Btn variant="ghost" onClick={syncFromOnlyFans} disabled={syncing}>
              {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              OF Sync
            </Btn>
          )}
          <Btn variant="brand" onClick={() => setWizard(true)}><Plus className="size-4" /> Onboarding</Btn>
        </>
      }
    >
      {/* Filters */}
      <Card className="p-3 lg:p-4 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name oder Handle…" className="pl-10" />
        </div>
        <Select value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)} className="w-auto min-w-[140px]">
          <option value="">Alle Nischen</option>
          {niches.map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto min-w-[140px]">
          <option value="">Alle Status</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="paused">Paused</option>
        </Select>
        {(q || nicheFilter || statusFilter) && (
          <Btn variant="outline" onClick={() => { setQ(""); setNicheFilter(""); setStatusFilter(""); }}>Reset</Btn>
        )}
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title={creators.length === 0 ? "Noch keine Creator" : "Keine Treffer"}
          message={
            creators.length === 0
              ? "Starte mit dem Onboarding — Handle sollte zum OnlyFans-Account passen für Auto-Verknüpfung."
              : "Passe Suche oder Filter an, um Creator zu finden."
          }
          action={
            creators.length === 0 ? (
              <Btn variant="brand" onClick={() => setWizard(true)}><Plus className="size-4" /> Onboarding starten</Btn>
            ) : (
              <Btn variant="outline" onClick={() => { setQ(""); setNicheFilter(""); setStatusFilter(""); }}>Filter zurücksetzen</Btn>
            )
          }
        />
      ) : view === "grid" || isMobile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          {filtered.map((c) => {
            const pct = c.monthlyGoal ? Math.min(100, Math.round((c.monthlyRevenue / c.monthlyGoal) * 100)) : 0;
            return (
              <Card key={c.id} className="p-4 lg:p-5 cursor-pointer hover:border-primary/40 transition" onClick={() => setSelected(c.id)}>
                <div className="flex items-start gap-3 mb-4">
                  <CreatorAvatar src={c.avatar} name={c.name} className="size-14" rounded="xl" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.handle}</div>
                    <div className="mt-1.5 flex gap-1.5 flex-wrap">
                      <Badge tone="info">{c.niche}</Badge>
                      <Badge tone={c.status === "active" ? "success" : c.status === "onboarding" ? "magenta" : "warning"}>{c.status}</Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                    <div className="font-display font-bold text-lg">{eur(c.monthlyRevenue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Subscribers</div>
                    <div className="font-display font-bold text-lg">{c.subscribers.toLocaleString("de-DE")}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                    <span className="flex items-center gap-1"><Target className="size-3" /> Goal {pct}%</span>
                    <span className={c.growth >= 0 ? "text-success" : "text-destructive"}>
                      {c.growth >= 0 ? <TrendingUp className="size-3 inline" /> : <TrendingDown className="size-3 inline" />} {c.growth}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users2 className="size-3" /> {c.team.length} Team</span>
                  <span>{c.revenueShare}% Share</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-elevated text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th onClick={() => toggleSort("name")} active={sort === "name"} ariaLabel="Sortieren nach Creator">Creator</Th>
                  <th className="text-left p-4">Niche</th>
                  <Th onClick={() => toggleSort("monthlyRevenue")} active={sort === "monthlyRevenue"} right>Revenue</Th>
                  <th className="text-right p-4">Goal</th>
                  <Th onClick={() => toggleSort("subscribers")} active={sort === "subscribers"} right>Subs</Th>
                  <th className="text-right p-4">Share</th>
                  <Th onClick={() => toggleSort("growth")} active={sort === "growth"} right>Trend</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}
                    onClick={() => setSelected(c.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(c.id); }}
                    role="button" tabIndex={0}
                    aria-label={`Open ${c.name} details`}
                    className="border-t border-border hover:bg-elevated/60 cursor-pointer">
                    <td className="p-4 flex items-center gap-3">
                      <CreatorAvatar src={c.avatar} name={c.name} className="size-9" rounded="lg" />
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.handle}</div>
                      </div>
                    </td>
                    <td className="p-4"><Badge tone="info">{c.niche}</Badge></td>
                    <td className="p-4 text-right font-display font-semibold">{eur(c.monthlyRevenue)}</td>
                    <td className="p-4 text-right text-muted-foreground">{eur(c.monthlyGoal)}</td>
                    <td className="p-4 text-right">{c.subscribers.toLocaleString("de-DE")}</td>
                    <td className="p-4 text-right">{c.revenueShare}%</td>
                    <td className={`p-4 text-right font-medium ${c.growth >= 0 ? "text-success" : "text-destructive"}`}>
                      {c.growth >= 0 ? "+" : ""}{c.growth}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {creator && (
        <CreatorDrawer
          creator={creator}
          team={team}
          onSave={(patch) => {
            update.mutate({ id: creator.id, ...patch }, {
              onSuccess: () => toast.success("Gespeichert"),
              onError: (e) => toast.error(e.message),
            });
          }}
          onDelete={() => {
            remove.mutate(creator.id, {
              onSuccess: () => {
                removeConversationsForCreator(creator.id);
                setSelected(null);
                toast("Creator entfernt");
              },
              onError: (e) => toast.error(e.message),
            });
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {wizard && (
        <OnboardingWizard
          onClose={() => setWizard(false)}
          onCreate={(c) => {
            create.mutate(c, {
              onSuccess: (created) => { toast.success(`${created.name} angelegt`); setWizard(false); },
              onError: (e) => toast.error(e.message),
            });
          }}
        />
      )}
    </AppShell>
  );
}

function Th({ children, onClick, active, right, ariaLabel }: { children: React.ReactNode; onClick: () => void; active: boolean; right?: boolean; ariaLabel?: string }) {
  const label = ariaLabel ?? (typeof children === 'string' ? String(children) : undefined);
  return (
    <th className={`p-4 ${right ? "text-right" : "text-left"}`}>
      <button aria-label={label ? `Sortieren nach ${label}` : undefined} onClick={onClick} className={`inline-flex items-center gap-1 ${active ? "text-primary" : ""} hover:text-foreground transition`}>
        {children} <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}

function CreatorDrawer({ creator, team, onSave, onDelete, onClose }: {
  creator: Creator;
  team: { id: string; name: string; role: string }[];
  onSave: (p: Partial<Creator>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { data: aiStatus } = useAiStatus();
  const aiRenewal = useAiRenewal();
  const aiPpv = useAiPpvCopy();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "library" | "contract" | "team" | "notes">("overview");
  const [notes, setNotes] = useState(creator.notes);
  const [goal, setGoal] = useState(creator.monthlyGoal);
  const [share, setShare] = useState(creator.revenueShare);
  const [status, setStatus] = useState<Creator["status"]>(creator.status);
  const [contractEnd, setContractEnd] = useState(creator.contractEndsAt);
  const [onlyfansUrl, setOnlyfansUrl] = useState(creator.onlyfansUrl ?? onlyFansProfileUrl(creator.handle));
  const [renewalFan, setRenewalFan] = useState("");
  const [renewalBrief, setRenewalBrief] = useState("");
  const [ppvVariants, setPpvVariants] = useState<string[]>([]);
  const [ppvPrice, setPpvPrice] = useState("25");
  const [ppvBundle, setPpvBundle] = useState("Exclusive Bundle");

  const daysLeft = Math.max(0, Math.ceil((new Date(contractEnd).getTime() - Date.now()) / 86400000));

  const generateRenewal = async () => {
    if (!aiStatus?.configured) return toast.error("AI_API_KEY in .env setzen");
    try {
      const pack = await aiRenewal.mutateAsync({
        creatorName: creator.name,
        niche: creator.niche,
        contractEndsAt: contractEnd,
        daysLeft,
        monthlyRevenue: creator.monthlyRevenue,
      });
      setRenewalFan(pack.fanMessage);
      setRenewalBrief(pack.managerBrief);
      toast.success("Renewal-Texte generiert");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "KI fehlgeschlagen");
    }
  };

  const generatePpv = async () => {
    if (!aiStatus?.configured) return toast.error("AI_API_KEY in .env setzen");
    try {
      const variants = await aiPpv.mutateAsync({
        creatorName: creator.name,
        niche: creator.niche,
        bundleName: ppvBundle,
        price: Number(ppvPrice) || 25,
        itemCount: 5,
        audience: "vip",
      });
      setPpvVariants(variants);
      toast.success("3 PPV-Upsell-Varianten bereit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "KI fehlgeschlagen");
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopiert");
  };

  const tabs = [
    { id: "overview" as const, label: "Übersicht" },
    { id: "library" as const, label: "Library" },
    { id: "contract" as const, label: "Vertrag" },
    { id: "team" as const, label: "Team" },
    { id: "notes" as const, label: "Notizen" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full sm:w-[520px] bg-background border-l border-border overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="p-5 lg:p-6 border-b border-border bg-gradient-card relative overflow-hidden"
          style={creator.headerUrl ? { backgroundImage: `url(${creator.headerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          {creator.headerUrl && <div className="absolute inset-0 bg-black/50" />}
          <button onClick={onClose} className="relative text-xs text-muted-foreground hover:text-foreground mb-3">← Schließen</button>
          <div className="relative flex items-center gap-4">
            <CreatorAvatar src={creator.avatar} name={creator.name} className="size-16" rounded="2xl" />
            <div className="min-w-0">
              <h2 className="font-display text-xl lg:text-2xl font-bold truncate">{creator.name}</h2>
              <div className="text-sm text-muted-foreground truncate">{creator.handle} · {creator.niche}</div>
            </div>
          </div>
          <div className="flex gap-1 mt-4 overflow-x-auto -mx-1 px-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 h-8 rounded-md text-xs font-medium whitespace-nowrap ${tab === t.id ? "bg-elevated border border-border text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 lg:p-6 space-y-5">
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Monatsumsatz", eur(creator.monthlyRevenue)],
                  ["Ziel", eur(creator.monthlyGoal)],
                  ["Revenue Share", `${creator.revenueShare}%`],
                  ["Subscribers", creator.subscribers.toLocaleString("de-DE")],
                ].map(([l, v]) => (
                  <div key={l} className="p-3 rounded-lg bg-elevated border border-border">
                    <div className="text-xs text-muted-foreground">{l}</div>
                    <div className="font-display font-bold text-lg mt-1">{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Goal Progress</div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gradient-brand transition-all" style={{ width: `${creator.monthlyGoal ? Math.min(100, (creator.monthlyRevenue / creator.monthlyGoal) * 100) : 0}%` }} />
                </div>
              </div>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as Creator["status"])}>
                  <option value="active">Active</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="paused">Paused</option>
                </Select>
              </Field>
              <Field label="OnlyFans Profil-URL">
                <Input value={onlyfansUrl} onChange={(e) => setOnlyfansUrl(e.target.value)} className="font-mono text-xs" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <a
                  href={onlyfansUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" /> OnlyFans öffnen
                </a>
                <Btn variant="ghost" size="sm" onClick={async () => {
                  try {
                    const res = await fetch("/api/onlyfans/sync-avatars", { method: "POST" });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    toast.success(data.message);
                    await qc.invalidateQueries({ queryKey: ["creators"] });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Sync fehlgeschlagen");
                  }
                }}>
                  <RefreshCw className="size-3.5" /> Profilbild von OF
                </Btn>
              </div>
              <div className="pt-4 border-t border-border space-y-3">
                <div className="text-xs font-medium flex items-center gap-2">
                  <Sparkles className="size-3.5 text-primary" /> PPV Upsell Copy
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Bundle"><Input value={ppvBundle} onChange={(e) => setPpvBundle(e.target.value)} /></Field>
                  <Field label="Preis €"><Input type="number" value={ppvPrice} onChange={(e) => setPpvPrice(e.target.value)} /></Field>
                </div>
                <Btn variant="ghost" size="sm" onClick={generatePpv} disabled={aiPpv.isPending || !aiStatus?.configured}>
                  {aiPpv.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Upsell-Texte generieren
                </Btn>
                {ppvVariants.map((v, i) => (
                  <div key={i} className="p-3 rounded-lg bg-elevated border border-border text-xs flex gap-2">
                    <span className="flex-1">{v}</span>
                    <button type="button" onClick={() => copyText(v)} className="shrink-0 text-primary"><Copy className="size-3.5" /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "library" && (
            <MediaLibraryPanel creatorId={creator.id} compact />
          )}

          {tab === "contract" && (
            <>
              <Field label="Monatsziel (€)"><Input type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></Field>
              <Field label={`Revenue Share: ${share}%`}>
                <input type="range" min={50} max={90} value={share} onChange={(e) => setShare(Number(e.target.value))} className="w-full accent-pink-500" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Creator {share}%</span><span>Agency {100 - share}%</span>
                </div>
              </Field>
              <Field label="Vertrag bis"><Input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} /></Field>
              <div className="p-3 rounded-lg bg-elevated border border-border text-xs text-muted-foreground">
                {daysLeft > 0 ? `${daysLeft} Tage bis Vertragsende` : "Vertrag abgelaufen oder heute fällig"}
              </div>
              <Btn variant="ghost" size="sm" onClick={generateRenewal} disabled={aiRenewal.isPending || !aiStatus?.configured}>
                {aiRenewal.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Renewal-Nachrichten (KI)
              </Btn>
              {renewalFan && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">An Fans / VIPs</div>
                  <div className="p-3 rounded-lg bg-elevated border border-border text-xs flex gap-2">
                    <span className="flex-1">{renewalFan}</span>
                    <button type="button" onClick={() => copyText(renewalFan)} className="text-primary"><Copy className="size-3.5" /></button>
                  </div>
                </div>
              )}
              {renewalBrief && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Intern · Renewal-Gespräch</div>
                  <div className="p-3 rounded-lg bg-elevated border border-border text-xs flex gap-2">
                    <span className="flex-1">{renewalBrief}</span>
                    <button type="button" onClick={() => copyText(renewalBrief)} className="text-primary"><Copy className="size-3.5" /></button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "team" && (
            <>
              <div className="text-xs text-muted-foreground">Zugewiesene Team-Mitglieder</div>
              <div className="space-y-2">
                {team.map((m) => {
                  const assigned = creator.team.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-elevated border border-border cursor-pointer hover:border-primary/40">
                      <input type="checkbox" checked={assigned}
                        onChange={(e) => {
                          const next = e.target.checked ? [...creator.team, m.id] : creator.team.filter((t) => t !== m.id);
                          onSave({ team: next });
                        }}
                        className="size-4 accent-pink-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.role}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {tab === "notes" && (
            <Field label="Notizen">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="h-40" />
            </Field>
          )}

          <div className="flex gap-2 pt-4 border-t border-border">
            <Btn variant="brand" className="flex-1" onClick={() => { onSave({ notes, monthlyGoal: goal, revenueShare: share, status, contractEndsAt: contractEnd, onlyfansUrl }); }}>
              <Check className="size-4" /> Speichern
            </Btn>
            <Btn variant="danger" onClick={() => { if (confirm(`${creator.name} wirklich entfernen?`)) onDelete(); }}>
              <Trash2 className="size-4" />
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingWizard({ onClose, onCreate }: { onClose: () => void; onCreate: (c: Omit<Creator, "id" | "trend">) => void }) {
  const { data: aiStatus } = useAiStatus();
  const aiOnboarding = useAiOnboarding();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", handle: "", niche: "Fashion & Lifestyle",
    revenueShare: 70, contractMonths: 24,
    monthlyGoal: 25000, subGoal: 8000,
    teamLead: "", brandColor: "#ec4899",
    tone: "flirty",
    bio: "", welcomeDm: "", personaNotes: "",
  });
  const steps = ["Basisdaten", "Vertrag & Share", "Ziele", "Persona (KI)", "Review"];

  const generatePersona = async () => {
    if (!form.name.trim()) return toast.error("Name zuerst eingeben");
    if (!aiStatus?.configured) return toast.error("AI_API_KEY in .env setzen");
    try {
      const pack = await aiOnboarding.mutateAsync({
        creatorName: form.name,
        handle: form.handle || `@${form.name.toLowerCase().replace(/\s+/g, "")}`,
        niche: form.niche,
        monthlyGoal: form.monthlyGoal,
        tone: form.tone,
      });
      setForm((f) => ({ ...f, bio: pack.bio, welcomeDm: pack.welcomeDm, personaNotes: pack.personaNotes }));
      toast.success("Persona-Paket generiert");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "KI fehlgeschlagen");
    }
  };

  const next = () => {
    if (step === 0 && !form.name.trim()) return toast.error("Künstlername fehlt");
    setStep(Math.min(steps.length - 1, step + 1));
  };

  const submit = () => {
    const today = new Date();
    const end = new Date(today); end.setMonth(end.getMonth() + form.contractMonths);
    const notesParts = [
      form.personaNotes && `Persona:\n${form.personaNotes}`,
      form.bio && `Bio:\n${form.bio}`,
      form.welcomeDm && `Welcome DM:\n${form.welcomeDm}`,
      form.teamLead && `Lead: ${form.teamLead}`,
    ].filter(Boolean);

    onCreate({
      name: form.name, handle: form.handle || `@${form.name.toLowerCase().replace(/\s+/g, "")}`,
      avatar: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='32' fill='${form.brandColor}'/></svg>`)}`,
      niche: form.niche, status: "onboarding",
      revenueShare: form.revenueShare, monthlyRevenue: 0, monthlyGoal: form.monthlyGoal,
      subscribers: 0, growth: 0, team: [],
      notes: notesParts.length ? notesParts.join("\n\n") : "Onboarding — Persona noch generieren",
      joinedAt: today.toISOString().slice(0, 10), contractEndsAt: end.toISOString().slice(0, 10),
    });
  };

  return (
    <Modal open onClose={onClose} title="Creator Onboarding" size="md"
      footer={<>
        <Btn variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Zurück</Btn>
        {step < steps.length - 1
          ? <Btn variant="brand" onClick={next}>Weiter →</Btn>
          : <Btn variant="brand" onClick={submit}><Check className="size-4" /> Erstellen</Btn>}
      </>}>
      <div className="mb-4 flex items-center gap-3">
        <div className="text-xs text-muted-foreground">Schritt {step + 1} von {steps.length}</div>
        <div className="flex-1 flex gap-1">
          {steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gradient-brand" : "bg-secondary"}`} />)}
        </div>
      </div>
      <div className="space-y-3">
        {step === 0 && (
          <>
            <Field label="Künstlername *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Aria Lux" autoFocus /></Field>
            <Field label="Handle"><Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@arialux" /></Field>
            <Field label="Niche">
              <Select value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })}>
                {niches.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <Field label={`Revenue Share: ${form.revenueShare}% Creator / ${100 - form.revenueShare}% Agency`}>
              <input type="range" min={50} max={90} value={form.revenueShare} onChange={(e) => setForm({ ...form, revenueShare: +e.target.value })} className="w-full accent-pink-500" />
            </Field>
            <Field label="Vertragslaufzeit (Monate)"><Input type="number" value={form.contractMonths} onChange={(e) => setForm({ ...form, contractMonths: +e.target.value })} /></Field>
            <Field label="Vertrags-Upload" hint="(Drag&Drop simuliert)">
              <div className="h-20 rounded-lg border-2 border-dashed border-border grid place-items-center text-xs text-muted-foreground cursor-pointer hover:border-primary/40">📎 contract.pdf hierher ziehen</div>
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Monatsziel (€)"><Input type="number" value={form.monthlyGoal} onChange={(e) => setForm({ ...form, monthlyGoal: +e.target.value })} /></Field>
            <Field label="Subscriber-Ziel"><Input type="number" value={form.subGoal} onChange={(e) => setForm({ ...form, subGoal: +e.target.value })} /></Field>
          </>
        )}
        {step === 3 && (
          <>
            <Field label="Tonalität">
              <Select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                <option value="flirty">Flirty</option>
                <option value="playful">Playful</option>
                <option value="premium">Premium</option>
                <option value="mysterious">Mysterious</option>
                <option value="wholesome">Wholesome</option>
              </Select>
            </Field>
            <Field label="Lead Manager (optional)"><Input value={form.teamLead} onChange={(e) => setForm({ ...form, teamLead: e.target.value })} /></Field>
            <Field label="Brand Color">
              <div className="flex gap-2 mt-1">
                {["#ec4899","#22d3ee","#a855f7","#f59e0b","#10b981","#f43f5e"].map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, brandColor: c })}
                    className={`size-10 rounded-lg transition ${form.brandColor === c ? "ring-2 ring-white scale-110" : ""}`}
                    style={{ background: c }} />
                ))}
              </div>
            </Field>
            <Btn variant="brand" className="w-full" onClick={generatePersona} disabled={aiOnboarding.isPending || !aiStatus?.configured}>
              {aiOnboarding.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Bio, Welcome-DM & Persona generieren
            </Btn>
            {form.bio && <Field label="Bio (OnlyFans About)"><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="h-16" /></Field>}
            {form.welcomeDm && <Field label="Welcome DM"><Textarea value={form.welcomeDm} onChange={(e) => setForm({ ...form, welcomeDm: e.target.value })} className="h-16" /></Field>}
            {form.personaNotes && <Field label="Chatter-Notizen"><Textarea value={form.personaNotes} onChange={(e) => setForm({ ...form, personaNotes: e.target.value })} className="h-24" /></Field>}
          </>
        )}
        {step === 4 && (
          <div className="space-y-2">
            {[
              ["Name", form.name || "—"],
              ["Handle", form.handle || `@${form.name.toLowerCase().replace(/\s+/g, "")}`],
              ["Niche", form.niche],
              ["Revenue Share", `${form.revenueShare}% / ${100 - form.revenueShare}%`],
              ["Vertragslaufzeit", `${form.contractMonths} Monate`],
              ["Monatsziel", eur(form.monthlyGoal)],
              ["Persona", form.personaNotes ? "✓ generiert" : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between p-2.5 rounded-lg bg-elevated border border-border text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
