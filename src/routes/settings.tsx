import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Field, Input } from "@/components/AppShell";
import { useStore, niches } from "@/lib/store";
import { Plug, Palette, FileText, Bell, Key, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings · Lumina Manage" },
    { name: "description", content: "Einstellungen: Agency Branding, Integrationen und Benachrichtigungen konfigurieren." },
    { property: "og:title", content: "Settings · Lumina Manage" },
    { property: "og:description", content: "Einstellungen: Agency Branding, Integrationen und Benachrichtigungen konfigurieren." },
    { property: "og:url", content: "/settings" },
  ], links: [{ rel: "canonical", href: "/settings" }] }),
  component: Settings,
});

const providers = [
  { id: "ofapi" as const, name: "OnlyFansAPI.com", desc: "Established 3rd-party · DM + Posts", recommended: true },
  { id: "ofauth" as const, name: "OFAuth", desc: "Auth-Flow + Session Management" },
  { id: "custom" as const, name: "Custom Provider", desc: "Eigene Base URL + API Key" },
];

function Settings() {
  const branding = useStore((s) => s.branding);
  const setBranding = useStore((s) => s.setBranding);
  const integrations = useStore((s) => s.integrations);
  const setIntegrations = useStore((s) => s.setIntegrations);

  const [tab, setTab] = useState<"integrations" | "branding" | "templates" | "notifications">("integrations");
  const tabs = [
    { id: "integrations" as const, label: "Integrations", icon: Plug },
    { id: "branding" as const, label: "Branding", icon: Palette },
    { id: "templates" as const, label: "Templates", icon: FileText },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  return (
    <AppShell title="Settings" subtitle="Connector, Branding, Templates und mehr">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-3">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 h-11 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    tab === t.id ? "bg-elevated border border-border text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
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
                <p className="text-xs text-muted-foreground mb-4">OnlyFans hat keine offizielle API – wähle einen kompatiblen Drittanbieter.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {providers.map((p) => {
                    const sel = integrations.providerId === p.id;
                    return (
                      <button key={p.id} onClick={() => { setIntegrations({ providerId: p.id }); toast.success(`${p.name} aktiv`); }}
                        className={`text-left p-4 rounded-xl border-2 relative cursor-pointer transition ${sel ? "border-primary bg-primary/10" : "border-border bg-elevated hover:border-primary/40"}`}>
                        {p.recommended && <div className="absolute -top-2 left-3"><Badge tone="magenta">Empfohlen</Badge></div>}
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
                        {sel && <Check className="size-5 text-success absolute top-3 right-3" />}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <Field label="Base URL"><Input value={integrations.baseUrl} onChange={(e) => setIntegrations({ baseUrl: e.target.value })} className="font-mono" /></Field>
                  <Field label="API Key"><Input type="password" value={integrations.apiKey} onChange={(e) => setIntegrations({ apiKey: e.target.value })} className="font-mono" /></Field>
                  <Field label="Webhook URL (eingehend)"><Input value={integrations.webhookUrl} onChange={(e) => setIntegrations({ webhookUrl: e.target.value })} className="font-mono" /></Field>
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${integrations.connected ? "bg-success animate-pulse" : "bg-destructive"}`} />
                      <span className={`text-sm font-medium ${integrations.connected ? "text-success" : "text-destructive"}`}>
                        {integrations.connected ? "Connected · Sync vor 2 Min" : "Nicht verbunden"}
                      </span>
                    </div>
                    <Btn variant="outline" size="sm" onClick={() => { setIntegrations({ connected: !integrations.connected }); toast.success(integrations.connected ? "Getrennt" : "Verbunden"); }}>
                      {integrations.connected ? "Trennen" : "Verbinden"}
                    </Btn>
                  </div>
                </div>
              </Card>

              <Card className="p-5 lg:p-6">
                <h2 className="font-display font-semibold mb-4">Weitere Integrationen</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: "Stripe", desc: "Payouts an Creators", status: "connected" },
                    { name: "Slack", desc: "Team-Benachrichtigungen", status: "connected" },
                    { name: "Google Drive", desc: "Media Library Sync", status: "available" },
                    { name: "QuickBooks", desc: "Buchhaltung & Steuer", status: "available" },
                  ].map((i) => (
                    <div key={i.name} className="p-4 rounded-lg bg-elevated border border-border flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{i.desc}</div>
                      </div>
                      <button onClick={() => toast.success(i.status === "connected" ? `${i.name} getrennt` : `${i.name} verbunden`)}>
                        <Badge tone={i.status === "connected" ? "success" : "default"}>{i.status === "connected" ? "Verbunden" : "Verbinden"}</Badge>
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {tab === "branding" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-semibold mb-4">Agency Branding</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Agency Name"><Input value={branding.name} onChange={(e) => setBranding({ name: e.target.value })} /></Field>
                <Field label="Logo-Text"><Input value={branding.logoText} onChange={(e) => setBranding({ logoText: e.target.value })} /></Field>
                <div>
                  <label className="text-xs text-muted-foreground">Primary Color</label>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {["#ec4899","#22d3ee","#a855f7","#f59e0b","#10b981","#f43f5e","#6366f1"].map((c) => (
                      <button key={c} onClick={() => { setBranding({ primary: c }); toast.success("Farbe übernommen"); }}
                        className={`size-10 rounded-lg transition ${branding.primary === c ? "ring-2 ring-white scale-110" : ""}`}
                        style={{ background: c, boxShadow: `0 0 20px ${c}55` }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Accent Color</label>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {["#22d3ee","#ec4899","#a855f7","#f59e0b","#10b981","#6366f1"].map((c) => (
                      <button key={c} onClick={() => { setBranding({ accent: c }); toast.success("Akzent übernommen"); }}
                        className={`size-10 rounded-lg transition ${branding.accent === c ? "ring-2 ring-white scale-110" : ""}`}
                        style={{ background: c, boxShadow: `0 0 20px ${c}55` }} />
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Logo Upload</label>
                  <div className="mt-1 h-24 rounded-lg border-2 border-dashed border-border grid place-items-center text-xs text-muted-foreground cursor-pointer hover:border-primary/40"
                    onClick={() => toast.success("Logo Upload bereit (Demo)")}>
                    📎 PNG/SVG hier ablegen
                  </div>
                </div>
                <div className="sm:col-span-2 p-4 rounded-lg bg-elevated border border-border">
                  <div className="text-xs text-muted-foreground mb-2">Live-Vorschau Header:</div>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl grid place-items-center text-white text-lg font-bold" style={{ background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}>L</div>
                    <div>
                      <div className="font-display font-bold">{branding.logoText}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{branding.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {tab === "templates" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-semibold mb-1">Content Strategy Templates</h2>
              <p className="text-xs text-muted-foreground mb-4">Vorgefertigte Posting-Pläne pro Niche.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {niches.map((n, i) => (
                  <button key={n} onClick={() => toast.success(`Template „${n}" angewendet`)}
                    className="text-left p-4 rounded-lg bg-elevated border border-border hover:border-primary/40 transition">
                    <div className="font-medium">{n}</div>
                    <div className="text-xs text-muted-foreground mt-1">{4 + (i % 3)} Posts/Woche · {2 + (i % 2)} PPVs · DM-Strategie</div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      <Badge tone="magenta">Posts</Badge><Badge tone="info">PPV</Badge><Badge tone="success">DM</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {tab === "notifications" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-semibold mb-4">Benachrichtigungen & Risk-Alerts</h2>
              <NotificationList />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
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
        <div key={n.label} className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-border gap-3">
          <span className="text-sm flex-1">{n.label}</span>
          <Badge tone={n.ch.includes("Slack") ? "info" : "success"}>{n.ch}</Badge>
          <button onClick={() => { setList((s) => s.map((x, j) => j === i ? { ...x, on: !x.on } : x)); toast.success(n.on ? "Deaktiviert" : "Aktiviert"); }}
            className={`w-11 h-6 rounded-full ${n.on ? "bg-gradient-brand" : "bg-secondary"} relative transition shrink-0`}>
            <div className={`absolute top-0.5 size-5 rounded-full bg-white transition ${n.on ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      ))}
    </div>
  );
}
