import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Modal, Field, Input, Select, Textarea } from "@/components/AppShell";
import {
  useScoutStatus,
  useScoutLeads,
  useScoutRefresh,
  useScoutRun,
  useScoutCheck,
  useScoutEnrich,
  useScoutOutreach,
  useScoutConvert,
  useScoutUpdate,
  useScoutDelete,
  type ScoutLead,
} from "@/hooks/useScout";
import { useAiStatus } from "@/hooks/useAi";
import { niches } from "@/lib/store";
import {
  Radar, Search, Loader2, ExternalLink, Sparkles, RefreshCw, UserPlus,
  Copy, Trash2, ChevronRight, Instagram, Filter,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/scout")({
  head: () => ({
    meta: [
      { title: "Talent Scout · Lumina Manage" },
      { name: "description", content: "KI-Talent-Scout: Creatorinnen im Web finden, bewerten und rekrutieren." },
    ],
    links: [{ rel: "canonical", href: "/scout" }],
  }),
  component: ScoutPage,
});

const STATUSES = [
  { id: "new", label: "Neu" },
  { id: "reviewed", label: "Geprüft" },
  { id: "shortlisted", label: "Shortlist" },
  { id: "contacted", label: "Kontaktiert" },
  { id: "rejected", label: "Abgelehnt" },
  { id: "converted", label: "Creator" },
] as const;

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "twitter", label: "X / Twitter" },
  { id: "linkhub", label: "Link-in-Bio" },
  { id: "reddit", label: "Reddit" },
];

function platformIcon(p: string) {
  if (p === "instagram") return Instagram;
  return ExternalLink;
}

function fmtFollowers(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function scoreTone(score: number): "success" | "warning" | "info" | "default" {
  if (score >= 75) return "success";
  if (score >= 55) return "info";
  if (score >= 40) return "warning";
  return "default";
}

function ScoutPage() {
  const { data: aiStatus } = useAiStatus();
  const { data: searchStatus } = useScoutStatus();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [minScore, setMinScore] = useState(0);
  const leadFilters = {
    status: statusFilter || undefined,
    minScore: minScore || undefined,
  };
  const { data: leads = [], isLoading, isFetching, isError, error, refetch } = useScoutLeads(leadFilters);
  const refreshScout = useScoutRefresh(refetch);
  const [refreshing, setRefreshing] = useState(false);

  const run = useScoutRun();
  const check = useScoutCheck();
  const enrich = useScoutEnrich();
  const outreach = useScoutOutreach();
  const convert = useScoutConvert();
  const update = useScoutUpdate();
  const remove = useScoutDelete();

  const [brief, setBrief] = useState("");
  const [niche, setNiche] = useState(niches[0]);
  const [region, setRegion] = useState("DE");
  const [minFollowers, setMinFollowers] = useState("2000");
  const [maxFollowers, setMaxFollowers] = useState("25000");
  const [ofFilter, setOfFilter] = useState<"none" | "any" | "has">("none");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["instagram", "tiktok", "linkhub"]);
  const [quickUrl, setQuickUrl] = useState("");
  const [detail, setDetail] = useState<ScoutLead | null>(null);
  const [checkResult, setCheckResult] = useState<ScoutLead | null>(null);

  const stats = useMemo(() => ({
    total: leads.length,
    high: leads.filter((l) => l.score >= 70).length,
    noOf: leads.filter((l) => !l.hasOnlyfans).length,
    shortlisted: leads.filter((l) => l.status === "shortlisted").length,
  }), [leads]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  };

  const handleRun = async () => {
    if (!selectedPlatforms.length) {
      toast.error("Mindestens eine Plattform wählen");
      return;
    }
    try {
      const result = await run.mutateAsync({
        brief: brief || `Finde ${niche} Creatorinnen in ${region}, ${minFollowers}-${maxFollowers} Follower`,
        niche,
        region,
        minFollowers: Number(minFollowers) || 1000,
        maxFollowers: Number(maxFollowers) || 50000,
        ofFilter,
        platforms: selectedPlatforms,
        limit: 12,
      });
      toast.success(result.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scout fehlgeschlagen");
    }
  };

  const handleQuickCheck = async () => {
    if (!quickUrl.trim()) return;
    try {
      const result = await check.mutateAsync(quickUrl.trim());
      setCheckResult(result.profile as ScoutLead);
      toast.success("Profil analysiert");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check fehlgeschlagen");
    }
  };

  const openDetail = (lead: ScoutLead) => setDetail(lead);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const count = await refreshScout();
      toast.success(`Aktualisiert · ${count} Lead${count === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktualisieren fehlgeschlagen");
    } finally {
      setRefreshing(false);
    }
  };

  const listBusy = isLoading || isFetching || refreshing;

  return (
    <AppShell
      title="Talent Scout"
      subtitle="KI durchsucht das Web · Profile scrapen · Leads bewerten"
      actions={
        <Btn variant="ghost" onClick={handleRefresh} disabled={listBusy}>
          <RefreshCw className={`size-4 ${listBusy ? "animate-spin" : ""}`} />
          {listBusy ? "Lädt…" : "Aktualisieren"}
        </Btn>
      }
    >
      <div className="space-y-5 pb-4">
        {searchStatus?.configured && !searchStatus.connected && (
          <Card className="p-4 border-destructive/30 bg-destructive/[0.06] text-sm">
            <strong className="text-foreground">Google-Verbindung fehlgeschlagen</strong>
            <p className="text-muted-foreground mt-1">
              {searchStatus.error ?? "Serper API nicht erreichbar"} — Scout nutzt vorerst DuckDuckGo als Fallback.
            </p>
          </Card>
        )}

        {!aiStatus?.configured && (
          <Card className="p-4 border-warning/30 bg-warning/[0.06] text-sm text-muted-foreground">
            <strong className="text-foreground">KI nicht konfiguriert</strong> — Scout nutzt Fallback-Suchen und Heuristik.
            Setze <code className="text-xs">AI_API_KEY</code> / Open WebUI in .env für bessere Ergebnisse.
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Leads</div><div className="text-2xl font-display font-bold">{stats.total}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Score ≥70</div><div className="text-2xl font-display font-bold text-success">{stats.high}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Ohne OF</div><div className="text-2xl font-display font-bold text-primary">{stats.noOf}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Shortlist</div><div className="text-2xl font-display font-bold text-cyan">{stats.shortlisted}</div></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Scout form */}
          <Card className="xl:col-span-5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Radar className="size-5 text-primary" />
              <h2 className="font-display font-semibold">KI-Scout starten</h2>
            </div>

            <Field label="Such-Brief (optional)">
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="z.B. Deutsche Fitness-Creatorinnen 3k–20k, noch kein OnlyFans, aktiv auf Instagram…"
                className="min-h-[80px]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nische">
                <Select value={niche} onChange={(e) => setNiche(e.target.value)}>
                  {niches.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label="Region">
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="DE, AT, CH…" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Min. Follower">
                <Input type="number" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} />
              </Field>
              <Field label="Max. Follower">
                <Input type="number" value={maxFollowers} onChange={(e) => setMaxFollowers(e.target.value)} />
              </Field>
            </div>

            <Field label="OnlyFans-Status">
              <Select value={ofFilter} onChange={(e) => setOfFilter(e.target.value as typeof ofFilter)}>
                <option value="none">Noch kein OF (Upside)</option>
                <option value="any">Egal</option>
                <option value="has">Bereits auf OF</option>
              </Select>
            </Field>

            <div>
              <span className="text-xs text-muted-foreground">Plattformen</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`px-3 h-8 rounded-lg text-xs font-medium border transition ${
                      selectedPlatforms.includes(p.id)
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Btn
              variant="brand"
              className="w-full"
              onClick={handleRun}
              disabled={run.isPending}
            >
              {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {run.isPending ? "Scout läuft… (30–90s)" : "Scout starten"}
            </Btn>

            {run.isPending && (
              <p className="text-xs text-muted-foreground text-center">
                Websuche → Profil-Scrape → KI-Scoring…
              </p>
            )}
          </Card>

          {/* Quick check */}
          <Card className="xl:col-span-7 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="size-5 text-cyan" />
              <h2 className="font-display font-semibold">Einzelprofil prüfen</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Instagram/TikTok-URL, @handle oder Linktree — scraped Bio, OF-Link, Follower-Hinweise.
            </p>
            <div className="flex gap-2">
              <Input
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="@username oder https://instagram.com/…"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleQuickCheck()}
              />
              <Btn variant="outline" onClick={handleQuickCheck} disabled={check.isPending}>
                {check.isPending ? <Loader2 className="size-4 animate-spin" /> : "Check"}
              </Btn>
            </div>

            {checkResult && (
              <div className="rounded-xl border border-border p-4 space-y-2 bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{checkResult.displayName}</div>
                  <Badge tone={scoreTone(checkResult.score)}>{checkResult.score}/100</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{checkResult.bio || checkResult.scoreReason}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="info">{checkResult.platform}</Badge>
                  {checkResult.hasOnlyfans ? <Badge tone="magenta">Hat OF</Badge> : <Badge tone="success">Kein OF</Badge>}
                  <Badge tone="default">{fmtFollowers(checkResult.followers)} Follower</Badge>
                </div>
                <a href={checkResult.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Profil öffnen <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </Card>
        </div>

        {/* Filters + list */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40 h-9">
              <option value="">Alle Status</option>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Select value={String(minScore)} onChange={(e) => setMinScore(Number(e.target.value))} className="w-36 h-9">
              <option value="0">Alle Scores</option>
              <option value="50">Score ≥50</option>
              <option value="65">Score ≥65</option>
              <option value="75">Score ≥75</option>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{leads.length} Leads</span>
          </div>

          {isError ? (
            <div className="p-12 text-center text-sm">
              <p className="text-destructive mb-3">{error instanceof Error ? error.message : "Leads konnten nicht geladen werden"}</p>
              <Btn variant="outline" size="sm" onClick={handleRefresh}>Erneut versuchen</Btn>
            </div>
          ) : listBusy && leads.length === 0 ? (
            <div className="p-12 grid place-items-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Noch keine Leads — starte einen Scout oder prüfe ein Einzelprofil.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leads.map((lead) => {
                const Icon = platformIcon(lead.platform);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => openDetail(lead)}
                    className="w-full text-left p-4 hover:bg-white/[0.03] transition flex gap-4 items-start"
                  >
                    <div className="size-10 rounded-xl bg-white/[0.06] grid place-items-center shrink-0">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{lead.displayName}</span>
                        {lead.handle && <span className="text-xs text-muted-foreground">{lead.handle}</span>}
                        <Badge tone={scoreTone(lead.score)}>{lead.score}</Badge>
                        {lead.hasOnlyfans ? <Badge tone="magenta">OF</Badge> : <Badge tone="success">Kein OF</Badge>}
                        <Badge tone="default">{STATUSES.find((s) => s.id === lead.status)?.label ?? lead.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.aiSummary || lead.scoreReason || lead.bio}</p>
                      <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>{lead.platform}</span>
                        <span>·</span>
                        <span>{fmtFollowers(lead.followers)}</span>
                        {lead.niche && <><span>·</span><span>{lead.niche}</span></>}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-3" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.displayName ?? "Lead"}
        size="lg"
        footer={
          detail && (
            <>
              <Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</Btn>
              <Btn
                variant="outline"
                disabled={remove.isPending}
                onClick={async () => {
                  if (!detail || !confirm("Lead löschen?")) return;
                  await remove.mutateAsync(detail.id);
                  toast.success("Gelöscht");
                  setDetail(null);
                }}
              >
                <Trash2 className="size-4" />
              </Btn>
            </>
          )
        }
      >
        {detail && (
          <LeadDetail
            lead={detail}
            onUpdate={(patch) => {
              update.mutate({ id: detail.id, patch }, {
                onSuccess: (d) => { setDetail(d.lead); toast.success("Gespeichert"); },
              });
            }}
            onEnrich={() => enrich.mutateAsync(detail.id).then((d) => { setDetail(d.lead); toast.success("Aktualisiert"); })}
            onOutreach={() => outreach.mutateAsync({ id: detail.id }).then((d) => { setDetail(d.lead); toast.success("Outreach erstellt"); })}
            onConvert={() => convert.mutateAsync(detail.id).then(() => { toast.success("Als Creator angelegt"); setDetail(null); })}
            enriching={enrich.isPending}
            outreaching={outreach.isPending}
            converting={convert.isPending}
          />
        )}
      </Modal>
    </AppShell>
  );
}

function LeadDetail({
  lead,
  onUpdate,
  onEnrich,
  onOutreach,
  onConvert,
  enriching,
  outreaching,
  converting,
}: {
  lead: ScoutLead;
  onUpdate: (patch: Partial<Pick<ScoutLead, "status" | "notes" | "outreachDraft">>) => void;
  onEnrich: () => void;
  onOutreach: () => void;
  onConvert: () => void;
  enriching: boolean;
  outreaching: boolean;
  converting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone={scoreTone(lead.score)}>Score {lead.score}/100</Badge>
        <Badge tone="info">{lead.platform}</Badge>
        {lead.hasOnlyfans ? <Badge tone="magenta">OnlyFans</Badge> : <Badge tone="success">Kein OF</Badge>}
        <Badge tone="default">{fmtFollowers(lead.followers)} Follower</Badge>
      </div>

      <p className="text-sm">{lead.aiSummary || lead.scoreReason}</p>
      {lead.bio && <p className="text-xs text-muted-foreground">{lead.bio}</p>}

      {lead.signals?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lead.signals.map((s) => <Badge key={s} tone="default">{s}</Badge>)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <a href={lead.profileUrl} target="_blank" rel="noreferrer">
          <Btn variant="outline" size="sm"><ExternalLink className="size-4" /> Profil</Btn>
        </a>
        {lead.onlyfansUrl && (
          <a href={lead.onlyfansUrl} target="_blank" rel="noreferrer">
            <Btn variant="outline" size="sm"><ExternalLink className="size-4" /> OnlyFans</Btn>
          </a>
        )}
        <Btn variant="ghost" size="sm" onClick={onEnrich} disabled={enriching}>
          {enriching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Re-Scrape
        </Btn>
        <Btn variant="ghost" size="sm" onClick={onOutreach} disabled={outreaching}>
          {outreaching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Outreach-KI
        </Btn>
        {lead.status !== "converted" && (
          <Btn variant="brand" size="sm" onClick={onConvert} disabled={converting}>
            {converting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Als Creator
          </Btn>
        )}
        {lead.creatorId && (
          <Link to="/creators">
            <Btn variant="outline" size="sm">Im Creator-Hub →</Btn>
          </Link>
        )}
      </div>

      <Field label="Pipeline-Status">
        <Select value={lead.status} onChange={(e) => onUpdate({ status: e.target.value })}>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
      </Field>

      <Field label="Notizen">
        <Textarea
          value={lead.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className="min-h-[60px]"
        />
      </Field>

      {lead.outreachDraft && (
        <Field label="Outreach-Entwurf">
          <div className="relative">
            <Textarea value={lead.outreachDraft} readOnly className="min-h-[100px] pr-12" />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(lead.outreachDraft); toast.success("Kopiert"); }}
              className="absolute top-2 right-2 size-8 grid place-items-center rounded-lg hover:bg-white/10"
            >
              <Copy className="size-4" />
            </button>
          </div>
        </Field>
      )}
    </div>
  );
}