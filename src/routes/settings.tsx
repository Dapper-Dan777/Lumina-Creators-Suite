import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Field, Input, Modal, Select } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useCreators } from "@/hooks/useCreators";
import { useContentTemplates, useApplyTemplate } from "@/hooks/useTemplates";
import { pickImageFile } from "@/lib/fileUpload";
import { Plug, Palette, FileText, Bell, Key, Check, Loader2, RefreshCw, Sparkles, Upload, Trash2, ImageIcon } from "lucide-react";
import { useAiStatus } from "@/hooks/useAi";
import { useOnlyFansStats } from "@/hooks/useOnlyFansStats";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Lumina Manage" },
      {
        name: "description",
        content:
          "Einstellungen: Agency Branding, Integrationen und Benachrichtigungen konfigurieren.",
      },
      { property: "og:title", content: "Settings · Lumina Manage" },
      {
        property: "og:description",
        content:
          "Einstellungen: Agency Branding, Integrationen und Benachrichtigungen konfigurieren.",
      },
      { property: "og:url", content: "/settings" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: Settings,
});

type OnlyFansServerStatus = {
  configured: boolean;
  provider: string;
  baseUrl: string;
  accountId: string | null;
  usernameFilter: string | null;
  hasApiKey: boolean;
  hasAccountId: boolean;
  hasUsernameFilter: boolean;
};

const providers = [
  {
    id: "ofapi" as const,
    name: "OnlyFansAPI.com",
    desc: "Read-only Sync · Profil-Test",
    recommended: true,
  },
  { id: "ofauth" as const, name: "OFAuth", desc: "Auth-Flow (geplant)" },
  { id: "custom" as const, name: "Custom Provider", desc: "Eigene Base URL" },
];

function Settings() {
  const branding = useStore((s) => s.branding);
  const setBranding = useStore((s) => s.setBranding);
  const integrations = useStore((s) => s.integrations);
  const setIntegrations = useStore((s) => s.setIntegrations);

  const [tab, setTab] = useState<
    "integrations" | "branding" | "templates" | "notifications"
  >("integrations");
  const [ofStatus, setOfStatus] = useState<OnlyFansServerStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<string | null>(null);
  const { data: aiStatus, isLoading: aiLoading, refetch: refetchAi } = useAiStatus();
  const { data: ofLive } = useOnlyFansStats();
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestMsg, setAiTestMsg] = useState<string | null>(null);
  const { data: creators = [] } = useCreators();
  const { data: templates = [], isLoading: templatesLoading } = useContentTemplates();
  const applyTemplate = useApplyTemplate();
  const [templateModal, setTemplateModal] = useState<{ niche: string; postCount: number; ppvCount: number; storyCount: number } | null>(null);
  const [templateCreatorId, setTemplateCreatorId] = useState("");

  const tabs = [
    { id: "integrations" as const, label: "Integrations", icon: Plug },
    { id: "branding" as const, label: "Branding", icon: Palette },
    { id: "templates" as const, label: "Templates", icon: FileText },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  const loadOfStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/integrations/onlyfans/status");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as OnlyFansServerStatus;
      setOfStatus(data);
      setIntegrations({ providerId: "ofapi" });
    } catch {
      setOfStatus(null);
      setIntegrations({ connected: false });
    } finally {
      setStatusLoading(false);
    }
  }, [setIntegrations]);

  useEffect(() => {
    loadOfStatus();
  }, [loadOfStatus]);

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/onlyfans/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test fehlgeschlagen");
      const label = data.profileName ?? "OK";
      setLastTest(label);
      setIntegrations({ connected: true });
      toast.success(`Verbunden: ${label}`);
      await loadOfStatus();
    } catch (e) {
      setIntegrations({ connected: false });
      toast.error(e instanceof Error ? e.message : "Verbindungstest fehlgeschlagen");
    } finally {
      setTesting(false);
    }
  }

  const serverReady = ofStatus?.hasApiKey ?? false;
  const liveConnected = ofLive?.connected ?? integrations.connected;

  return (
    <AppShell title="Settings" subtitle="Connector, Branding, Templates und mehr">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-3">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 h-11 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    tab === t.id
                      ? "bg-elevated border border-border text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`size-4 ${tab === t.id ? "text-primary" : ""}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-9 space-y-4">
          {tab === "integrations" && (
            <>
              <Card className="p-5 lg:p-6">
                <h2 className="font-display font-semibold mb-1 flex items-center gap-2">
                  <Key className="size-5 text-primary" /> OnlyFans Connector
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Credentials liegen in der Server-<code className="font-mono">.env</code> — nicht
                  im Browser. Lumina nutzt nur read-only Tests (Profil), kein Auto-Post.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {providers.map((p) => {
                    const sel = integrations.providerId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setIntegrations({ providerId: p.id });
                          toast.success(`${p.name} aktiv`);
                        }}
                        className={`text-left p-4 rounded-xl border-2 relative cursor-pointer transition ${
                          sel
                            ? "border-primary bg-primary/10"
                            : "border-border bg-elevated hover:border-primary/40"
                        }`}
                      >
                        {p.recommended && (
                          <div className="absolute -top-2 left-3">
                            <Badge tone="magenta">Empfohlen</Badge>
                          </div>
                        )}
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
                        {sel && (
                          <Check className="size-5 text-success absolute top-3 right-3" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-border bg-elevated p-4 space-y-3 mb-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Server-Status
                  </div>
                  {statusLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Prüfe Konfiguration…
                    </div>
                  ) : ofStatus ? (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">API Key</dt>
                        <dd className={ofStatus.hasApiKey ? "text-success" : "text-destructive"}>
                          {ofStatus.hasApiKey ? "✓ in .env gesetzt" : "✗ ONLYFANS_API_KEY fehlt"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">OF Username (Filter)</dt>
                        <dd className={ofStatus.hasUsernameFilter ? "text-success" : "text-muted-foreground"}>
                          {ofStatus.usernameFilter ?? "optional — bei mehreren Accounts"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Account ID</dt>
                        <dd className={ofStatus.hasAccountId ? "text-success" : "text-muted-foreground"}>
                          {ofStatus.accountId ?? "auto — aus /api/accounts"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">Base URL</dt>
                        <dd className="font-mono text-xs break-all">{ofStatus.baseUrl}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-destructive">
                      API nicht erreichbar — starte den Backend-Container (Port 4000).
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    In <code className="font-mono">.env</code>:{" "}
                    <code className="font-mono">ONLYFANS_API_KEY</code> (ofapi_…). Danach
                    OnlyFans-Account unter{" "}
                    <a href="https://app.onlyfansapi.com" target="_blank" rel="noreferrer" className="text-primary underline">
                      app.onlyfansapi.com
                    </a>{" "}
                    verbinden. Optional: <code className="font-mono">ONLYFANS_ACCOUNT_ID</code> (acct_…)
                  </p>
                </div>

                <Field label="Webhook URL (lokal, optional)">
                  <Input
                    value={integrations.webhookUrl}
                    onChange={(e) => setIntegrations({ webhookUrl: e.target.value })}
                    className="font-mono"
                    placeholder="https://…/of-webhook"
                  />
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-2 rounded-full ${
                        liveConnected ? "bg-success animate-pulse" : "bg-destructive"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        liveConnected ? "text-success" : "text-destructive"
                      }`}
                    >
                      {statusLoading
                        ? "Prüfe…"
                        : liveConnected
                          ? `Verbunden${lastTest ? ` · ${lastTest}` : ""}`
                          : serverReady
                            ? "API-Key OK — OF-Account verbinden & testen"
                            : "ONLYFANS_API_KEY in .env setzen"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="ghost" size="sm" onClick={loadOfStatus} disabled={statusLoading}>
                      <RefreshCw
                        className={`size-4 ${statusLoading ? "animate-spin" : ""}`}
                      />
                    </Btn>
                    <Btn
                      variant="brand"
                      size="sm"
                      onClick={testConnection}
                      disabled={testing || !ofStatus?.hasApiKey}
                    >
                      {testing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Verbindung testen
                    </Btn>
                  </div>
                </div>
              </Card>

              <Card className="p-5 lg:p-6">
                <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" /> KI (Chatter & Captions)
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Powered by OpenAI-kompatible API. Nutzt Creator-Persona, Fan-Kontext und Chat-Verlauf für
                  authentische OF-Antworten — kein Auto-Send, nur Vorschläge.
                </p>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Prüfe KI-Konfiguration…
                  </div>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">API Key</dt>
                      <dd className={aiStatus?.hasApiKey ? "text-success" : "text-destructive"}>
                        {aiStatus?.hasApiKey ? "✓ in .env gesetzt" : "✗ AI_API_KEY fehlt"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Modell</dt>
                      <dd className="font-mono text-xs">{aiStatus?.model ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Hosting</dt>
                      <dd>
                        <Badge tone={aiStatus?.local ? "success" : "info"}>
                          {aiStatus?.local ? "Lokal" : "Cloud"}
                        </Badge>
                        {aiStatus?.provider && (
                          <span className="text-xs text-muted-foreground ml-2">{aiStatus.provider}</span>
                        )}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Base URL</dt>
                      <dd className="font-mono text-xs break-all">{aiStatus?.baseUrl ?? "—"}</dd>
                    </div>
                  </dl>
                )}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Btn
                    variant="brand"
                    size="sm"
                    disabled={aiTesting || !aiStatus?.configured}
                    onClick={async () => {
                      setAiTesting(true);
                      try {
                        const res = await fetch("/api/ai/test", { method: "POST" });
                        const data = await res.json();
                        if (!res.ok || !data.ok) throw new Error(data.error ?? "Test fehlgeschlagen");
                        setAiTestMsg(data.message ?? "OK");
                        toast.success(`KI verbunden: ${data.model}`);
                        refetchAi();
                      } catch (e) {
                        setAiTestMsg(null);
                        toast.error(e instanceof Error ? e.message : "KI-Test fehlgeschlagen");
                      } finally {
                        setAiTesting(false);
                      }
                    }}
                  >
                    {aiTesting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    KI testen
                  </Btn>
                  {aiTestMsg && <span className="text-xs text-success">{aiTestMsg}</span>}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Lokal (Open WebUI/Ollama): <code className="font-mono">AI_BASE_URL=http://host.docker.internal:3000/api/v1</code> —
                  nicht <code className="font-mono">localhost</code> (Docker!). Danach{" "}
                  <code className="font-mono">docker compose up -d --build api</code>.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge tone="info">Messaging → KI-Button</Badge>
                  <Badge tone="info">Studio → AI Captions</Badge>
                  <Badge tone="info">Mass DM → KI generieren</Badge>
                </div>
              </Card>

              <Card className="p-5 lg:p-6">
                <h2 className="font-display font-semibold mb-4">Weitere Integrationen</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: "Stripe", desc: "Payouts an Creators", status: "demo" },
                    { name: "Slack", desc: "Team-Benachrichtigungen", status: "demo" },
                    { name: "Google Drive", desc: "Media Library Sync", status: "available" },
                    { name: "QuickBooks", desc: "Buchhaltung & Steuer", status: "available" },
                  ].map((i) => (
                    <div
                      key={i.name}
                      className="p-4 rounded-lg bg-elevated border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{i.desc}</div>
                      </div>
                      <button
                        onClick={() =>
                          toast.info(
                            i.status === "demo"
                              ? `${i.name} — Demo-Platzhalter, noch nicht angebunden`
                              : `${i.name} — bald verfügbar`,
                          )
                        }
                      >
                        <Badge tone={i.status === "demo" ? "warning" : "default"}>
                          {i.status === "demo" ? "Demo" : "Bald"}
                        </Badge>
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {tab === "branding" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-semibold mb-1">Agency Branding</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Logo, Sidebar-Hintergrund und Profilbild werden lokal gespeichert und in der Navigation angezeigt.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Agency Name">
                  <Input
                    value={branding.name}
                    onChange={(e) => setBranding({ name: e.target.value })}
                  />
                </Field>
                <Field label="Logo-Text">
                  <Input
                    value={branding.logoText}
                    onChange={(e) => setBranding({ logoText: e.target.value })}
                  />
                </Field>
                <div>
                  <label className="text-xs text-muted-foreground">Primary Color</label>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {[
                      "#ec4899",
                      "#22d3ee",
                      "#a855f7",
                      "#f59e0b",
                      "#10b981",
                      "#f43f5e",
                      "#6366f1",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setBranding({ primary: c });
                          toast.success("Farbe übernommen");
                        }}
                        className={`size-10 rounded-lg transition ${branding.primary === c ? "ring-2 ring-white scale-110" : ""}`}
                        style={{ background: c, boxShadow: `0 0 20px ${c}55` }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Accent Color</label>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {["#22d3ee", "#ec4899", "#a855f7", "#f59e0b", "#10b981", "#6366f1"].map(
                      (c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setBranding({ accent: c });
                            toast.success("Akzent übernommen");
                          }}
                          className={`size-10 rounded-lg transition ${branding.accent === c ? "ring-2 ring-white scale-110" : ""}`}
                          style={{ background: c, boxShadow: `0 0 20px ${c}55` }}
                        />
                      ),
                    )}
                  </div>
                </div>
                <BrandingUpload
                  label="Logo"
                  hint="PNG, JPG oder WebP · max. 12 MB"
                  value={branding.logoUrl}
                  onUpload={(url) => { setBranding({ logoUrl: url }); toast.success("Logo gespeichert"); }}
                  onRemove={() => { setBranding({ logoUrl: undefined }); toast.success("Logo entfernt"); }}
                  previewClass="size-16 rounded-xl object-cover"
                />
                <BrandingUpload
                  label="Sidebar-Hintergrund"
                  hint="Banner wie OF-Profil-Header"
                  value={branding.headerBgUrl}
                  onUpload={(url) => { setBranding({ headerBgUrl: url }); toast.success("Hintergrund gespeichert"); }}
                  onRemove={() => { setBranding({ headerBgUrl: undefined }); toast.success("Hintergrund entfernt"); }}
                  previewClass="h-16 w-full rounded-xl object-cover"
                  wide
                />
                <BrandingUpload
                  label="Agency-Profilbild"
                  hint="Wird im Plan-Bereich der Sidebar angezeigt"
                  value={branding.profileImageUrl}
                  onUpload={(url) => { setBranding({ profileImageUrl: url }); toast.success("Profilbild gespeichert"); }}
                  onRemove={() => { setBranding({ profileImageUrl: undefined }); toast.success("Profilbild entfernt"); }}
                  previewClass="size-16 rounded-full object-cover"
                />
                <div className="sm:col-span-2 p-4 rounded-lg bg-elevated border border-border overflow-hidden">
                  <div className="text-xs text-muted-foreground mb-2">Live-Vorschau Sidebar:</div>
                  <div
                    className="rounded-xl border border-border p-3 relative overflow-hidden"
                    style={branding.headerBgUrl ? { backgroundImage: `url(${branding.headerBgUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {branding.headerBgUrl && <div className="absolute inset-0 bg-black/55" />}
                    <div className="relative flex items-center gap-3">
                      {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt="" className="size-10 rounded-xl object-cover" />
                      ) : (
                        <div
                          className="size-10 rounded-xl grid place-items-center text-white text-lg font-bold"
                          style={{ background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}
                        >
                          {branding.logoText.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-display font-bold">{branding.logoText}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {branding.name}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border">
                    {branding.profileImageUrl ? (
                      <img src={branding.profileImageUrl} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <div className="size-9 rounded-full bg-gradient-brand grid place-items-center text-white text-xs font-bold">A</div>
                    )}
                    <div className="text-sm">
                      <div className="font-medium">{branding.name}</div>
                      <div className="text-[10px] text-muted-foreground">Agency Plan · Pro</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {tab === "templates" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-semibold mb-1">Content Strategy Templates</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Vorgefertigte Posting-Pläne pro Niche — erstellt geplante Posts im Studio-Kalender.
              </p>
              {templatesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="size-4 animate-spin" /> Templates laden…
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((t) => (
                    <button
                      key={t.niche}
                      onClick={() => {
                        if (!creators.length) return toast.error("Zuerst einen Creator anlegen");
                        setTemplateCreatorId(creators.find((c) => c.niche === t.niche)?.id ?? creators[0].id);
                        setTemplateModal(t);
                      }}
                      className="text-left p-4 rounded-lg bg-elevated border border-border hover:border-primary/40 transition"
                    >
                      <div className="font-medium">{t.niche}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.postCount} Posts · {t.ppvCount} PPVs · {t.storyCount} Stories · {t.total} gesamt
                      </div>
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        <Badge tone="magenta">Posts</Badge>
                        <Badge tone="info">PPV</Badge>
                        <Badge tone="success">Story</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Modal
            open={!!templateModal}
            onClose={() => setTemplateModal(null)}
            title={templateModal ? `Template: ${templateModal.niche}` : ""}
            size="sm"
            footer={
              <>
                <Btn variant="ghost" onClick={() => setTemplateModal(null)}>Abbrechen</Btn>
                <Btn
                  variant="brand"
                  disabled={!templateCreatorId || applyTemplate.isPending}
                  onClick={async () => {
                    if (!templateModal) return;
                    try {
                      const result = await applyTemplate.mutateAsync({
                        niche: templateModal.niche,
                        creatorId: templateCreatorId,
                      });
                      toast.success(result.message);
                      setTemplateModal(null);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Template fehlgeschlagen");
                    }
                  }}
                >
                  {applyTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Anwenden
                </Btn>
              </>
            }
          >
            <p className="text-sm text-muted-foreground mb-4">
              Erstellt {templateModal?.total ?? 0} geplante Content-Items für den gewählten Creator.
              Sichtbar im Studio unter Kalender.
            </p>
            <Field label="Creator">
              <Select value={templateCreatorId} onChange={(e) => setTemplateCreatorId(e.target.value)}>
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.niche}</option>
                ))}
              </Select>
            </Field>
          </Modal>

          {tab === "notifications" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-semibold mb-4">
                Benachrichtigungen & Risk-Alerts
              </h2>
              <NotificationList />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function BrandingUpload({
  label,
  hint,
  value,
  onUpload,
  onRemove,
  previewClass,
  wide,
}: {
  label: string;
  hint: string;
  value?: string;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
  previewClass: string;
  wide?: boolean;
}) {
  const pick = () => {
    pickImageFile((dataUrl) => {
      try {
        onUpload(dataUrl);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
      }
    });
  };

  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="text-xs text-muted-foreground">{label}</label>
      {value ? (
        <div className="mt-1 flex items-center gap-3">
          <img src={value} alt="" className={previewClass} />
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={pick}>
              <Upload className="size-4" /> Ersetzen
            </Btn>
            <Btn variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="size-4" /> Entfernen
            </Btn>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          className="mt-1 w-full h-24 rounded-lg border-2 border-dashed border-border grid place-items-center text-xs text-muted-foreground hover:border-primary/40 transition gap-1"
        >
          <ImageIcon className="size-5 opacity-60" />
          <span>{hint}</span>
        </button>
      )}
    </div>
  );
}

function NotificationList() {
  const initial = [
    { label: "Creator unter 80% Monatsziel", on: true, ch: "Slack + Email" },
    { label: "Plötzlicher Subscriber-Drop > 5%", on: true, ch: "Email" },
    { label: "Fan-Beschwerde eingegangen", on: true, ch: "Slack + Email" },
    { label: "Vertrag läuft in 30 Tagen ab", on: true, ch: "Email" },
    { label: "Payout fehlgeschlagen", on: true, ch: "Slack + Email" },
    { label: "Approval Queue > 10 Items", on: false, ch: "Email" },
  ];
  const [list, setList] = useState(initial);
  return (
    <div className="space-y-2">
      {list.map((n, i) => (
        <div
          key={n.label}
          className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-border gap-3"
        >
          <span className="text-sm flex-1">{n.label}</span>
          <Badge tone={n.ch.includes("Slack") ? "info" : "success"}>{n.ch}</Badge>
          <button
            onClick={() => {
              setList((s) => s.map((x, j) => (j === i ? { ...x, on: !x.on } : x)));
              toast.success(n.on ? "Deaktiviert" : "Aktiviert");
            }}
            className={`w-11 h-6 rounded-full ${n.on ? "bg-gradient-brand" : "bg-secondary"} relative transition shrink-0`}
          >
            <div
              className={`absolute top-0.5 size-5 rounded-full bg-white transition ${n.on ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}