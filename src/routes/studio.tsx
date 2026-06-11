import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Modal, Field, Input, Select, Textarea } from "@/components/AppShell";
import { PostingAssistant, isPostableToday } from "@/components/PostingAssistant";
import { MediaLibraryPanel } from "@/components/MediaLibraryPanel";
import { ContentCalendar } from "@/components/ContentCalendar";
import { useContent, useContentMutations } from "@/hooks/useContent";
import { useCreators } from "@/hooks/useCreators";
import { useAiCaption, useAiStatus } from "@/hooks/useAi";
import { type ContentStatus, type ContentItem, eur } from "@/lib/store";
import { Sparkles, Image as ImageIcon, Calendar as CalendarIcon, CheckCircle2, Clock, FileEdit, Plus, Trash2, Check, Upload, Send, Loader2 } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [
    { title: "Content Studio · Lumina Manage" },
    { name: "description", content: "Content Studio: Ideen, Drafts und Scheduling für Creator in Lumina Manage." },
    { property: "og:title", content: "Content Studio · Lumina Manage" },
    { property: "og:description", content: "Content Studio: Ideen, Drafts und Scheduling für Creator in Lumina Manage." },
    { property: "og:url", content: "/studio" },
  ], links: [{ rel: "canonical", href: "/studio" }] }),
  component: Studio,
});

const STATUSES: ContentStatus[] = ["draft", "pending", "approved", "scheduled"];

function Studio() {
  const { data: content = [], isLoading: contentLoading } = useContent();
  const { data: creators = [], isLoading: creatorsLoading } = useCreators();
  const { update } = useContentMutations();
  const [tab, setTab] = useState<"queue" | "library" | "calendar" | "ai">("queue");
  const [postingItem, setPostingItem] = useState<ContentItem | null>(null);

  const todayItems = useMemo(() => content.filter(isPostableToday), [content]);
  const loading = contentLoading || creatorsLoading;
  const postingCreator = postingItem
    ? creators.find((c) => c.id === postingItem.creatorId)
    : null;

  const tabs = [
    { id: "queue" as const, label: "Approval", icon: CheckCircle2 },
    { id: "library" as const, label: "Library", icon: ImageIcon },
    { id: "calendar" as const, label: "Kalender", icon: CalendarIcon },
    { id: "ai" as const, label: "AI Captions", icon: Sparkles },
  ];

  if (loading) {
    return (
      <AppShell title="Content Studio" subtitle="Lade Daten…">
        <Card className="p-12 grid place-items-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Content Studio" subtitle="Approval Workflow · Media · Calendar · AI">
      <div className="flex gap-1 mb-5 p-1 rounded-lg bg-elevated border border-border w-fit overflow-x-auto max-w-full">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 lg:px-4 h-9 rounded-md text-xs lg:text-sm font-medium transition whitespace-nowrap ${
                tab === t.id ? "bg-gradient-brand text-white shadow-glow" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {todayItems.length > 0 && (
        <Card className="mb-4 p-4 border-primary/30 bg-primary/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display font-semibold text-sm flex items-center gap-2">
                <Send className="size-4 text-primary" />
                Heute fällig — {todayItems.length} Post{todayItems.length !== 1 ? "s" : ""}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Assisted Workflow: Caption kopieren → OnlyFans öffnen → manuell bestätigen
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {todayItems.slice(0, 3).map((item) => {
                const cr = creators.find((c) => c.id === item.creatorId);
                return (
                  <Btn
                    key={item.id}
                    variant="brand"
                    size="sm"
                    onClick={() => setPostingItem(item)}
                  >
                    {cr?.name.split(" ")[0]} · {item.title.slice(0, 20)}
                    {item.title.length > 20 ? "…" : ""}
                  </Btn>
                );
              })}
              {todayItems.length > 3 && (
                <Badge tone="info">+{todayItems.length - 3} weitere im Kalender</Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {tab === "queue" && <Queue onPostToday={setPostingItem} />}
      {tab === "library" && <Library />}
      {tab === "calendar" && <ContentCalendar onPostToday={setPostingItem} />}
      {tab === "ai" && <AIStudio />}

      {postingItem && postingCreator && (
        <PostingAssistant
          item={postingItem}
          creatorName={postingCreator.name}
          creatorHandle={postingCreator.handle}
          creatorNiche={postingCreator.niche}
          onlyfansUrl={postingCreator.onlyfansUrl}
          onPublished={() => update.mutate({ id: postingItem.id, status: "published" })}
          onClose={() => setPostingItem(null)}
        />
      )}
    </AppShell>
  );
}

function Queue({ onPostToday }: { onPostToday: (item: ContentItem) => void }) {
  const { data: content = [] } = useContent();
  const { data: creators = [] } = useCreators();
  const { update, create, remove } = useContentMutations();

  const [bulk, setBulk] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const cName = (id: string) => creators.find((c) => c.id === id)?.name ?? "—";

  const onDrop = (e: DragEvent, status: ContentStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || drag;
    if (id) {
      update.mutate({ id, status });
      toast.success(`Verschoben → ${status}`);
    }
    setDrag(null);
  };

  const bulkAction = (status: ContentStatus) => {
    bulk.forEach((id) => update.mutate({ id, status }));
    toast.success(`${bulk.size} Items → ${status}`);
    setBulk(new Set());
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Btn variant="brand" size="sm" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Neuer Content</Btn>
        {bulk.size > 0 && (
          <>
            <span className="text-xs text-muted-foreground">{bulk.size} ausgewählt</span>
            <Btn variant="outline" size="sm" onClick={() => bulkAction("approved")}><Check className="size-3.5" /> Approve</Btn>
            <Btn variant="outline" size="sm" onClick={() => bulkAction("draft")}>↩ Zurück zu Draft</Btn>
            <Btn variant="danger" size="sm" onClick={() => { bulk.forEach((id) => remove.mutate(id)); toast(`${bulk.size} gelöscht`); setBulk(new Set()); }}>
              <Trash2 className="size-3.5" /> Löschen
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setBulk(new Set())}>Abbrechen</Btn>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
        {STATUSES.map((status) => (
          <Card key={status} className="p-3 lg:p-4 min-h-[200px]"
            onDragOver={(e: DragEvent) => e.preventDefault()}
            onDrop={(e: DragEvent) => onDrop(e, status)}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold capitalize flex items-center gap-2">
                {status === "draft" && <FileEdit className="size-4 text-muted-foreground" />}
                {status === "pending" && <Clock className="size-4 text-warning" />}
                {status === "approved" && <CheckCircle2 className="size-4 text-success" />}
                {status === "scheduled" && <CalendarIcon className="size-4 text-cyan" />}
                {status}
              </h2>
              <Badge>{content.filter((c) => c.status === status).length}</Badge>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {content.filter((c) => c.status === status).map((item) => (
                <div key={item.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", item.id); setDrag(item.id); }}
                  onDragEnd={() => setDrag(null)}
                  className={`p-3 rounded-lg bg-elevated border border-border hover:border-primary/40 cursor-grab active:cursor-grabbing transition ${drag === item.id ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={bulk.has(item.id)}
                      onChange={(e) => { const n = new Set(bulk); e.target.checked ? n.add(item.id) : n.delete(item.id); setBulk(n); }}
                      className="mt-1 accent-pink-500" onClick={(e) => e.stopPropagation()} />
                    <div className="flex-1 min-w-0">
                      <div className="aspect-video rounded-md mb-2" style={{ background: item.cover }} />
                      <div className="text-sm font-medium leading-tight">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{cName(item.creatorId)}</div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge tone="info">{item.type}{item.price ? ` · €${item.price}` : ""}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(item.scheduledFor).toLocaleDateString("de-DE")}</span>
                      </div>
                      {status === "pending" && (
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => { update.mutate({ id: item.id, status: "approved" }); toast.success("Approved"); }}
                            className="flex-1 h-7 rounded-md bg-success/20 text-success text-xs font-medium hover:bg-success/30">✓ Approve</button>
                          <button onClick={() => { update.mutate({ id: item.id, status: "draft" }); toast("Zurück zu Draft"); }}
                            className="flex-1 h-7 rounded-md bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30">✗ Reject</button>
                        </div>
                      )}
                      {status === "approved" && (
                        <button onClick={() => { update.mutate({ id: item.id, status: "scheduled" }); toast.success("Geplant"); }}
                          className="w-full mt-2 h-7 rounded-md bg-cyan/20 text-cyan text-xs font-medium hover:bg-cyan/30">📅 Einplanen</button>
                      )}
                      {isPostableToday(item) && (
                        <button
                          onClick={() => onPostToday(item)}
                          className="w-full mt-2 h-7 rounded-md bg-gradient-brand text-white text-xs font-medium shadow-glow flex items-center justify-center gap-1"
                        >
                          <Send className="size-3" /> Heute posten
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {content.filter((c) => c.status === status).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-border rounded-lg">
                  hierher ziehen
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {addOpen && (
        <AddContentModal
          onClose={() => setAddOpen(false)}
          onAdd={(c) => {
            create.mutate(c, {
              onSuccess: () => { toast.success("Content angelegt"); setAddOpen(false); },
              onError: (e) => toast.error(e.message),
            });
          }}
        />
      )}
    </>
  );
}

function AddContentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Omit<ContentItem, "id">) => void }) {
  const { data: creators = [] } = useCreators();
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [type, setType] = useState<ContentItem["type"]>("Post");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<string[]>([]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files).slice(0, 4).map((f) => f.name);
    setFiles((s) => [...s, ...list]);
    if (list.length) toast.success(`${list.length} Datei(en) bereit`);
  };

  return (
    <Modal open onClose={onClose} title="Content hinzufügen"
      footer={<>
        <Btn variant="outline" onClick={onClose}>Abbrechen</Btn>
        <Btn variant="brand" onClick={() => {
          if (!title.trim()) return toast.error("Titel fehlt");
          onAdd({
            title,
            caption: caption.trim() || title,
            creatorId,
            type,
            status: "draft",
            scheduledFor: new Date(date).toISOString(),
            price: price ? Number(price) : undefined,
            cover: `linear-gradient(135deg,#ec4899,#22d3ee)`,
          });
        }}><Check className="size-4" /> Anlegen</Btn>
      </>}>
      <div className="space-y-4">
        <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground hover:border-primary/40 transition cursor-pointer">
          <Upload className="size-6 mx-auto mb-2 text-primary" />
          Dateien hierher ziehen oder klicken
          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {files.map((f, i) => <Badge key={i} tone="info">{f}</Badge>)}
            </div>
          )}
        </div>
        <Field label="Titel"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beach photoshoot — set #5" autoFocus /></Field>
        <Field label="Caption (für OnlyFans)">
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="h-20" placeholder="Text der in die Zwischenablage kopiert wird…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Creator">
            <Select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Typ">
            <Select value={type} onChange={(e) => setType(e.target.value as ContentItem["type"])}>
              <option>Post</option><option>PPV</option><option>Video</option><option>Story</option>
            </Select>
          </Field>
          <Field label="PPV Preis (€)"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25" /></Field>
          <Field label="Geplant am"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function Library() {
  return <MediaLibraryPanel />;
}

const TONE_PRESETS = ["flirty", "playful", "premium", "mysterious", "wholesome"];

function AIStudio() {
  const { data: creators = [] } = useCreators();
  const { data: aiStatus } = useAiStatus();
  const aiCaption = useAiCaption();
  const [prompt, setPrompt] = useState("");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [tone, setTone] = useState("flirty");
  const [contentType, setContentType] = useState("Post");
  const [ppvPrice, setPpvPrice] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const generate = async () => {
    if (!prompt.trim()) return toast.error("Beschreibung fehlt");
    const c = creators.find((x) => x.id === creatorId);
    if (!c) return toast.error("Creator wählen");
    if (!aiStatus?.configured) return toast.error("AI_API_KEY in .env setzen");
    try {
      const captions = await aiCaption.mutateAsync({
        creatorName: c.name,
        niche: c.niche,
        tone,
        description: prompt,
        contentType,
        ppvPrice: ppvPrice ? Number(ppvPrice) : undefined,
      });
      setResults(captions);
      toast.success("3 Captions generiert");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "KI fehlgeschlagen");
    }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Kopiert"); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5 lg:p-6">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> Caption Generator
        </h2>
        <div className="space-y-3">
          <Field label="Creator-Stil">
            <Select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.niche}</option>)}
            </Select>
          </Field>
          <Field label="Tonalität">
            <div className="flex flex-wrap gap-1.5">
              {TONE_PRESETS.map((t) => (
                <button key={t} onClick={() => setTone(t)} className={`px-3 h-8 rounded-md text-xs font-medium capitalize transition ${tone === t ? "bg-gradient-brand text-white" : "bg-elevated border border-border"}`}>{t}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Typ">
              <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                <option value="Post">Post</option>
                <option value="PPV">PPV</option>
                <option value="Video">Video</option>
                <option value="Story">Story</option>
              </Select>
            </Field>
            {contentType === "PPV" && (
              <Field label="PPV Preis (€)">
                <Input type="number" value={ppvPrice} onChange={(e) => setPpvPrice(e.target.value)} placeholder="25" />
              </Field>
            )}
          </div>
          <Field label="Content-Beschreibung">
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-24" placeholder="z.B. Beach shoot golden hour, lingerie set #3, playful vibe…" />
          </Field>
          {!aiStatus?.configured && (
            <p className="text-xs text-amber-500">AI_API_KEY in .env setzen um KI-Captions zu nutzen</p>
          )}
          <Btn variant="brand" className="w-full" size="lg" onClick={generate} disabled={aiCaption.isPending || !aiStatus?.configured}>
            {aiCaption.isPending ? <><Loader2 className="size-4 animate-spin" /> Generiere…</> : <><Sparkles className="size-4" /> Captions generieren</>}
          </Btn>
        </div>
      </Card>
      <Card className="p-5 lg:p-6">
        <h2 className="font-display font-semibold mb-4">Vorschläge</h2>
        {results.length === 0 && <div className="text-sm text-muted-foreground py-12 text-center">Klicke „Generieren" für 3 Varianten</div>}
        <div className="space-y-3">
          {results.map((c, i) => (
            <div key={i} className="p-4 rounded-lg bg-elevated border border-border hover:border-primary/40 transition">
              <div className="text-sm leading-relaxed">{c}</div>
              <div className="flex items-center justify-between mt-3">
                <Badge tone="magenta">Variante {i + 1}</Badge>
                <button onClick={() => copy(c)} className="text-xs text-primary font-medium hover:underline">📋 Kopieren</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
