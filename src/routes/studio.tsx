import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Modal, Field, Input, Select, Textarea } from "@/components/AppShell";
import { useStore, type ContentStatus, type ContentItem, eur } from "@/lib/store";
import { Sparkles, Image as ImageIcon, Calendar as CalendarIcon, CheckCircle2, Clock, FileEdit, Plus, Trash2, Check, X, Upload, Send } from "lucide-react";
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
  const [tab, setTab] = useState<"queue" | "library" | "calendar" | "ai">("queue");
  const tabs = [
    { id: "queue" as const, label: "Approval", icon: CheckCircle2 },
    { id: "library" as const, label: "Library", icon: ImageIcon },
    { id: "calendar" as const, label: "Kalender", icon: CalendarIcon },
    { id: "ai" as const, label: "AI Captions", icon: Sparkles },
  ];

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

      {tab === "queue" && <Queue />}
      {tab === "library" && <Library />}
      {tab === "calendar" && <CalendarView />}
      {tab === "ai" && <AIStudio />}
    </AppShell>
  );
}

function Queue() {
  const content = useStore((s) => s.content);
  const creators = useStore((s) => s.creators);
  const moveContent = useStore((s) => s.moveContent);
  const addContent = useStore((s) => s.addContent);
  const removeContent = useStore((s) => s.removeContent);

  const [bulk, setBulk] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const cName = (id: string) => creators.find((c) => c.id === id)?.name ?? "—";

  const onDrop = (e: DragEvent, status: ContentStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || drag;
    if (id) {
      moveContent(id, status);
      toast.success(`Verschoben → ${status}`);
    }
    setDrag(null);
  };

  const bulkAction = (status: ContentStatus) => {
    bulk.forEach((id) => moveContent(id, status));
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
            <Btn variant="danger" size="sm" onClick={() => { bulk.forEach((id) => removeContent(id)); toast(`${bulk.size} gelöscht`); setBulk(new Set()); }}>
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
                          <button onClick={() => { moveContent(item.id, "approved"); toast.success("Approved"); }}
                            className="flex-1 h-7 rounded-md bg-success/20 text-success text-xs font-medium hover:bg-success/30">✓ Approve</button>
                          <button onClick={() => { moveContent(item.id, "draft"); toast("Zurück zu Draft"); }}
                            className="flex-1 h-7 rounded-md bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30">✗ Reject</button>
                        </div>
                      )}
                      {status === "approved" && (
                        <button onClick={() => { moveContent(item.id, "scheduled"); toast.success("Geplant"); }}
                          className="w-full mt-2 h-7 rounded-md bg-cyan/20 text-cyan text-xs font-medium hover:bg-cyan/30">📅 Einplanen</button>
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

      {addOpen && <AddContentModal onClose={() => setAddOpen(false)} onAdd={(c) => { addContent(c); toast.success("Content angelegt"); setAddOpen(false); }} />}
    </>
  );
}

function AddContentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Omit<ContentItem, "id">) => void }) {
  const creators = useStore((s) => s.creators);
  const [title, setTitle] = useState("");
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
            title, creatorId, type, status: "draft",
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
  const content = useStore((s) => s.content);
  const creators = useStore((s) => s.creators);
  const [filter, setFilter] = useState("");
  const items = useMemo(() => content.filter((c) => !filter || c.type === filter), [content, filter]);

  return (
    <Card className="p-5 lg:p-6">
      <div className="flex flex-wrap gap-2 mb-4">
        {["", "Post", "PPV", "Video", "Story"].map((f) => (
          <button key={f || "all"} onClick={() => setFilter(f)}
            className={`px-3 h-8 rounded-md text-xs font-medium transition ${filter === f ? "bg-gradient-brand text-white" : "bg-elevated border border-border hover:border-primary/40"}`}>
            {f || "Alle"}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">{items.length} Items</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((item) => {
          const c = creators.find((cr) => cr.id === item.creatorId);
          return (
            <div key={item.id} className="aspect-square rounded-lg relative overflow-hidden group cursor-pointer border border-border" style={{ background: item.cover }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent group-hover:from-black/90 transition" />
              <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white">
                <div className="font-medium truncate">{item.title}</div>
                <div className="opacity-70 truncate">{c?.name}</div>
              </div>
              <div className="absolute top-2 right-2"><Badge tone="magenta">{item.type}</Badge></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CalendarView() {
  const content = useStore((s) => s.content);
  const reschedule = useStore((s) => s.rescheduleContent);
  const [drag, setDrag] = useState<string | null>(null);

  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  // Build current month grid (28 days starting Monday of current week)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);

  const cells = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const items = content.filter((c) => c.scheduledFor.slice(0, 10) === iso);
    return { d, iso, items };
  });

  return (
    <Card className="p-3 lg:p-6">
      <div className="grid grid-cols-7 gap-1.5 lg:gap-2">
        {days.map((d) => <div key={d} className="text-xs font-medium text-muted-foreground text-center pb-2">{d}</div>)}
        {cells.map((c, i) => {
          const today = c.iso === new Date().toISOString().slice(0, 10);
          return (
            <div key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || drag; if (id) { reschedule(id, new Date(c.iso).toISOString()); toast.success(`Verschoben auf ${c.d.toLocaleDateString("de-DE")}`); } setDrag(null); }}
              className={`min-h-[80px] lg:min-h-[100px] p-1.5 lg:p-2 rounded-lg border transition ${today ? "bg-primary/10 border-primary/40" : "bg-elevated border-border hover:border-primary/30"}`}>
              <div className={`text-[10px] lg:text-xs mb-1 ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>{c.d.getDate()}</div>
              <div className="space-y-1">
                {c.items.slice(0, 3).map((it) => (
                  <div key={it.id} draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", it.id); setDrag(it.id); }}
                    onDragEnd={() => setDrag(null)}
                    className={`text-[9px] lg:text-[10px] px-1 lg:px-1.5 py-0.5 rounded truncate cursor-grab ${
                      it.type === "PPV" ? "bg-primary/25 text-primary" : it.type === "Post" ? "bg-cyan/25 text-cyan" : "bg-warning/25 text-warning"
                    }`}>
                    {it.type} · {it.title}
                  </div>
                ))}
                {c.items.length > 3 && <div className="text-[9px] text-muted-foreground">+{c.items.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
        💡 Items per Drag&Drop in andere Tage ziehen
      </div>
    </Card>
  );
}

const TONE_PRESETS = ["flirty", "playful", "premium", "mysterious", "wholesome"];

function AIStudio() {
  const creators = useStore((s) => s.creators);
  const [prompt, setPrompt] = useState("Beach photoshoot, golden hour, playful mood");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [tone, setTone] = useState("flirty");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (!prompt.trim()) return toast.error("Beschreibung fehlt");
    setLoading(true);
    setTimeout(() => {
      const c = creators.find((x) => x.id === creatorId);
      const niche = c?.niche ?? "Lifestyle";
      const variants = {
        flirty: [
          `Hey baby ✨ ${prompt.split(",")[0]} — wer kommt mit? 💋`,
          `Dachte gerade an dich beim ${prompt.split(",")[0]} 😘 willst sehen was ich getragen hab?`,
          `Drei neue Sets sind live für meine VIPs 🔥 DM für den Drop`,
        ],
        playful: [
          `${prompt.split(",")[0]} ✨ Sand zwischen den Zehen, gute Laune ⭐`,
          `Wer würde mit mir tauschen? 😏 Heute war's perfekt — neue Pics in den DMs`,
          `Spoiler: das nächste Set wird wild 🌶️ stay tuned ${niche.toLowerCase()} family`,
        ],
        premium: [
          `Ein neues Kapitel beginnt – exklusiv für meine engsten Supporter. 🤍`,
          `Nur die feinste Auswahl: heute Abend, nur für VIP-Tier. Aktiviert deine Notifications.`,
          `${niche} in seiner reinsten Form – verfügbar in deiner DM.`,
        ],
        mysterious: [
          `Manche Dinge zeige ich nur in den DMs. 🌙`,
          `Du wirst es lieben… aber nur wenn du fragst. 🕊️`,
          `Heute Nacht passiert etwas. Bist du dabei?`,
        ],
        wholesome: [
          `Was für ein magischer Tag ✨ danke fürs Daheim-Halten dieser Vibes 💕`,
          `Du machst meine Woche besser, einfach indem du hier bist 🥰`,
          `Kleine BTS-Story für meine Lieblingsmenschen — ihr seid Gold wert.`,
        ],
      } as Record<string, string[]>;
      setResults(variants[tone]);
      setLoading(false);
    }, 700);
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
          <Field label="Content-Beschreibung">
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-24" placeholder="Was zeigt das Set?" />
          </Field>
          <Btn variant="brand" className="w-full" size="lg" onClick={generate} disabled={loading}>
            {loading ? "Generiere…" : <><Sparkles className="size-4" /> Captions generieren</>}
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
