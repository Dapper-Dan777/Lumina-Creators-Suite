import { useState } from "react";
import { Copy, ExternalLink, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Btn, Modal, Badge } from "@/components/AppShell";
import { onlyFansProfileUrl } from "@/lib/onlyfans";
import { useAiImproveCaption, useAiStatus } from "@/hooks/useAi";
import { toast } from "sonner";
import type { ContentItem } from "@/lib/store";

type Props = {
  item: ContentItem;
  creatorName: string;
  creatorHandle?: string;
  creatorNiche?: string;
  onlyfansUrl?: string | null;
  onPublished: () => void;
  onClose: () => void;
};

export function buildPostingCaption(item: ContentItem, creatorName: string) {
  const lines = [
    item.caption?.trim() || item.title,
    item.type === "PPV" && item.price ? `PPV · €${item.price}` : null,
    item.caption?.trim() && item.caption.trim() !== item.title ? `— ${item.title}` : null,
    item.type !== "PPV" ? `Typ: ${item.type}` : null,
    `#${creatorName.replace(/\s+/g, "")}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function isScheduledToday(iso: string) {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function isPostableToday(item: ContentItem) {
  return (
    (item.status === "scheduled" || item.status === "approved") &&
    isScheduledToday(item.scheduledFor)
  );
}

export function PostingAssistant({
  item,
  creatorName,
  creatorHandle,
  creatorNiche,
  onlyfansUrl,
  onPublished,
  onClose,
}: Props) {
  const { data: aiStatus } = useAiStatus();
  const improveCaption = useAiImproveCaption();
  const [step, setStep] = useState<"prepare" | "confirm">("prepare");
  const [copying, setCopying] = useState(false);
  const [caption, setCaption] = useState(() => buildPostingCaption(item, creatorName));
  const ofUrl = onlyFansProfileUrl(creatorHandle, onlyfansUrl);

  async function copyCaption() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Caption in Zwischenablage");
    } catch {
      toast.error("Kopieren fehlgeschlagen — Text manuell markieren");
    } finally {
      setCopying(false);
    }
  }

  async function improveWithAi() {
    if (!aiStatus?.configured) return toast.error("AI_API_KEY in .env setzen");
    try {
      const improved = await improveCaption.mutateAsync({
        creatorName,
        niche: creatorNiche,
        contentType: item.type,
        title: item.title,
        draftCaption: caption,
        ppvPrice: item.price,
      });
      setCaption(improved);
      toast.success("Caption von KI verbessert");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "KI fehlgeschlagen");
    }
  }

  function openOnlyFans() {
    window.open(ofUrl, "_blank", "noopener,noreferrer");
    setStep("confirm");
    toast.info("Poste jetzt manuell auf OnlyFans, dann bestätige hier.");
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Heute posten — Assisted"
      size="md"
      footer={
        step === "prepare" ? (
          <>
            <Btn variant="outline" onClick={onClose}>
              Abbrechen
            </Btn>
            <Btn
              variant="ghost"
              onClick={improveWithAi}
              disabled={improveCaption.isPending || !aiStatus?.configured}
            >
              {improveCaption.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              KI verbessern
            </Btn>
            <Btn variant="outline" onClick={copyCaption} disabled={copying}>
              {copying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}
              Caption kopieren
            </Btn>
            <Btn variant="brand" onClick={openOnlyFans}>
              <ExternalLink className="size-4" />
              OnlyFans öffnen
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="outline" onClick={() => setStep("prepare")}>
              Zurück
            </Btn>
            <Btn
              variant="brand"
              onClick={() => {
                onPublished();
                toast.success("Als veröffentlicht markiert");
                onClose();
              }}
            >
              <CheckCircle2 className="size-4" />
              Manuell gepostet — bestätigen
            </Btn>
          </>
        )
      }
    >
      <p className="text-xs text-muted-foreground mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        Du postest selbst auf OnlyFans. Lumina kopiert nur Text — kein Auto-Post, kein
        API-Send. Erst nach deiner Bestätigung wird der Status auf „published“ gesetzt.
      </p>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{item.type}</Badge>
          <span className="font-medium">{creatorName}</span>
          {creatorHandle && (
            <span className="text-muted-foreground text-xs">{creatorHandle}</span>
          )}
        </div>
        <pre className="p-3 rounded-lg bg-elevated border border-border text-xs whitespace-pre-wrap font-sans">
          {caption}
        </pre>
        <div className="text-xs text-muted-foreground">
          Geplant: {new Date(item.scheduledFor).toLocaleString("de-DE")}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono truncate">
          → {ofUrl}
        </div>
        {step === "confirm" && (
          <p className="text-xs text-primary">
            Schritt 2: Hast du den Post auf OnlyFans veröffentlicht?
          </p>
        )}
      </div>
    </Modal>
  );
}