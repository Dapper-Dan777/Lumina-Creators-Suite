import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, Loader2, RefreshCw, Zap } from "lucide-react";
import { AppShell, Badge, Btn, Card } from "@/components/AppShell";

type N8nStatus = {
  enabled: boolean;
  connected: boolean;
  baseUrl?: string;
  embedUrl?: string;
  message: string;
};

const IFRAME_LOAD_TIMEOUT_MS = 20000;

export const Route = createFileRoute("/automation")({
  head: () => ({
    meta: [
      { title: "Automationen · Lumina Manage" },
      { name: "description", content: "Automationen: eingebettete n8n-Oberfläche und Workflow-Controls." },
      { property: "og:title", content: "Automationen · Lumina Manage" },
      { property: "og:url", content: "/automation" },
    ],
    links: [{ rel: "canonical", href: "/automation" }],
  }),
  component: Automation,
});

function Automation() {
  const [status, setStatus] = useState<N8nStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeLoadedRef = useRef(false);

  async function loadStatus() {
    try {
      const response = await fetch("/api/n8n/status");
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = (await response.json()) as N8nStatus;
      setStatus(data);
    } catch {
      setStatus({
        enabled: false,
        connected: false,
        message: "API-Server nicht erreichbar. Starte den Backend-Server auf Port 4000.",
      });
    } finally {
      setLoading(false);
    }
  }

  function reloadIframe() {
    iframeLoadedRef.current = false;
    setIframeLoading(true);
    setIframeTimedOut(false);
    setIframeKey((k) => k + 1);
  }

  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(loadStatus, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!status?.connected) return;

    iframeLoadedRef.current = false;
    setIframeLoading(true);
    setIframeTimedOut(false);

    const timeout = window.setTimeout(() => {
      if (!iframeLoadedRef.current) {
        setIframeLoading(false);
        setIframeTimedOut(true);
      }
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [status?.connected, iframeKey]);

  const embedPort = 5679;
  const iframeUrl = status?.connected
    ? `${window.location.protocol}//${window.location.hostname}:${embedPort}/`
    : (status?.embedUrl ? `${status.embedUrl}/` : null);
  const directUrl = status?.baseUrl?.includes("host.docker.internal")
    ? "http://localhost:5678"
    : (status?.baseUrl ?? "http://localhost:5678");

  return (
    <AppShell
      title="Automationen"
      subtitle="n8n Workflows"
      actions={
        status?.connected ? (
          <div className="flex items-center gap-2">
            <Badge tone="success">n8n verbunden</Badge>
            <Btn variant="ghost" size="sm" onClick={() => window.open(directUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="size-4" />
              Direkt öffnen
            </Btn>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <Card className="h-[80vh] grid place-items-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Prüfe n8n-Verbindung…
          </div>
        </Card>
      ) : status?.connected && iframeUrl ? (
        <div className="space-y-3">
          <Card className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">n8n Editor eingebettet</p>
                <p className="text-xs text-muted-foreground truncate">
                  {iframeUrl ?? `Port ${embedPort} → n8n`}
                </p>
              </div>
            </div>
            <Btn variant="outline" size="sm" onClick={reloadIframe}>
              <RefreshCw className="size-4" />
              Neu laden
            </Btn>
          </Card>

          {iframeTimedOut && (
            <Card className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning/10">
              <p className="text-sm text-muted-foreground">
                Der Editor braucht länger als erwartet. Du kannst ihn direkt in einem neuen Tab öffnen.
              </p>
              <Btn variant="brand" size="sm" onClick={() => window.open(directUrl, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="size-4" />
                n8n öffnen
              </Btn>
            </Card>
          )}

          <div className="relative h-[75vh]">
            {iframeLoading && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg border border-border bg-background/90 backdrop-blur-sm pointer-events-none">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  n8n wird geladen…
                </div>
              </div>
            )}
            <iframe
              key={iframeKey}
              src={iframeUrl}
              className="w-full h-full border rounded-lg bg-background"
              title="n8n"
              allow="clipboard-read; clipboard-write"
              onLoad={() => {
                iframeLoadedRef.current = true;
                setIframeLoading(false);
                setIframeTimedOut(false);
              }}
            />
          </div>
        </div>
      ) : (
        <Card className="p-6 lg:p-8 max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-warning/15 border border-warning/30 grid place-items-center shrink-0">
              <AlertCircle className="size-6 text-warning" />
            </div>
            <div className="space-y-4 min-w-0">
              <div>
                <h2 className="font-display text-xl font-bold">n8n nicht verbunden</h2>
                <p className="text-sm text-muted-foreground mt-1">{status?.message}</p>
              </div>

              <div className="rounded-xl bg-elevated border border-border p-4 text-sm space-y-3">
                <p className="font-medium flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  n8n separat in Docker starten
                </p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>n8n starten: <code className="text-foreground">docker compose -f docker-compose.n8n.yml up -d</code></li>
                  <li>In <code className="text-foreground">.env</code>: <code className="text-foreground">N8N_BASE_URL=http://host.docker.internal:5678</code></li>
                  <li>App neu starten: <code className="text-foreground">npm run docker:up</code></li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-2">
                <Btn variant="outline" onClick={() => { setLoading(true); loadStatus(); }}>
                  Erneut prüfen
                </Btn>
                <Btn variant="ghost" onClick={() => window.open(directUrl, "_blank", "noopener,noreferrer")}>
                  <ExternalLink className="size-4" />
                  n8n direkt öffnen
                </Btn>
              </div>
            </div>
          </div>
        </Card>
      )}
    </AppShell>
  );
}