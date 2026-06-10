import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Modal, Field, Input, Select, Textarea } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Send, Sparkles, Megaphone, FileText, Bot, ArrowLeft, Pin, Plus, Search, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/messaging")({
  head: () => ({ meta: [
    { title: "Messaging Hub · Lumina Manage" },
    { name: "description", content: "Messaging Hub: Conversations mit Fans und Team, zentralisiert in Lumina Manage." },
    { property: "og:title", content: "Messaging Hub · Lumina Manage" },
    { property: "og:description", content: "Messaging Hub: Conversations mit Fans und Team, zentralisiert in Lumina Manage." },
    { property: "og:url", content: "/messaging" },
  ], links: [{ rel: "canonical", href: "/messaging" }] }),
  component: Messaging,
});

const TEMPLATES = [
  { name: "Welcome DM", text: "Heyyy welcome 💕 ich freu mich SO dass du da bist. Was bringt dich her?" },
  { name: "PPV Push", text: "Babe ich hab gerade was Neues hochgeladen 🔥 willst du es als erstes sehen? Nur 25€ und exclusive für dich 😘" },
  { name: "Renewal Reminder", text: "Hey love 💋 dein Abo läuft bald aus – aktiviere Auto-Renew und bekomm 20% off auf alle PPVs diese Woche" },
  { name: "Birthday Special", text: "Happy Birthday 🎂 ich hab da was ganz besonderes für dich vorbereitet… DM zurück für deine Überraschung 🎁" },
];

const AI_SUGGESTIONS = [
  "Awwww danke baby 💕 ich hab tatsächlich was Neues – willst sehen?",
  "Du bist süß 😘 ich schick dir gleich ein exklusives Bundle, 25€ für 10 neue clips",
  "Heyyy gerne 🔥 was bringt dich auf die Idee?",
];

function Messaging() {
  const conversations = useStore((s) => s.conversations);
  const creators = useStore((s) => s.creators);
  const send = useStore((s) => s.sendMessage);
  const markRead = useStore((s) => s.markRead);

  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "");
  const [filter, setFilter] = useState<"Alle" | "DM" | "PPV" | "Mass">("Alle");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [massOpen, setMassOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  const filtered = useMemo(() =>
    conversations.filter((c) => (filter === "Alle" || c.channel === filter) &&
      (!search || c.fan.toLowerCase().includes(search.toLowerCase()))),
    [conversations, filter, search]);

  const conv = conversations.find((c) => c.id === activeId);
  const creator = conv ? creators.find((c) => c.id === conv.creatorId) : null;

  const handleSend = () => {
    if (!draft.trim() || !conv) return;
    send(conv.id, draft);
    setDraft("");
    // simulate fan reply
    setTimeout(() => send(conv.id, "Ohhh nice, schick rüber 😘", "fan"), 1200);
  };

  const openChat = (id: string) => {
    setActiveId(id);
    markRead(id);
    setMobileView("chat");
  };

  return (
    <AppShell title="Messaging Hub" subtitle="Unified Inbox · AI Replies · Mass Messages">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 h-[calc(100dvh-200px)] lg:h-[calc(100dvh-220px)]">
        {/* Inbox */}
        <Card className={`lg:col-span-4 p-0 flex flex-col overflow-hidden ${mobileView === "chat" ? "hidden lg:flex" : "flex"}`}>
          <div className="p-3 lg:p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Inbox</h2>
              <Badge tone="magenta">{conversations.reduce((s, c) => s + c.unread, 0)} neu</Badge>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Fans suchen…" className="pl-10 h-9" />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {(["Alle","DM","PPV","Mass"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 h-7 rounded-md text-xs whitespace-nowrap ${filter === f ? "bg-gradient-brand text-white" : "bg-elevated border border-border"}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((m) => {
              const c = creators.find((cr) => cr.id === m.creatorId)!;
              return (
                <button key={m.id} onClick={() => openChat(m.id)}
                  className={`w-full text-left p-3 lg:p-4 border-b border-border flex gap-3 hover:bg-elevated/60 transition ${activeId === m.id ? "bg-elevated/80" : ""}`}>
                  <div className="relative shrink-0">
                    <img src={c.avatar} className="size-10 rounded-full" alt="" />
                    {m.unread > 0 && <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-[10px] font-bold text-white border-2 border-background">{m.unread}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        {m.pinned && <Pin className="size-3 text-primary" />} {m.fan}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">€{m.spend}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{m.messages.at(-1)?.text}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge tone="info">{c.name.split(" ")[0]}</Badge>
                      <Badge tone={m.channel === "PPV" ? "magenta" : m.channel === "Mass" ? "warning" : "default"}>{m.channel}</Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Conversation */}
        <Card className={`lg:col-span-5 p-0 flex flex-col overflow-hidden ${mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
          {conv && creator ? (
            <>
              <div className="p-3 lg:p-4 border-b border-border flex items-center gap-3">
                <button onClick={() => setMobileView("list")} className="lg:hidden size-9 grid place-items-center rounded-lg hover:bg-elevated"><ArrowLeft className="size-4" /></button>
                <img src={creator.avatar} className="size-10 rounded-full" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{conv.fan}</div>
                  <div className="text-xs text-muted-foreground truncate">via {creator.name} · Total spent €{conv.spend}</div>
                </div>
                <Badge tone="success"><Bot className="size-3" /> AI</Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/40">
                {conv.messages.map((m) =>
                  m.from === "fan"
                    ? <FanBubble key={m.id} text={m.text} time={m.time} />
                    : <ChatterBubble key={m.id} text={m.text} time={m.time} ai={m.from === "ai"} />
                )}
              </div>
              <div className="p-3 lg:p-4 border-t border-border space-y-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {AI_SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => setDraft(s)}
                      className="px-3 h-8 rounded-md bg-primary/10 border border-primary/30 text-xs text-primary whitespace-nowrap hover:bg-primary/20 transition">
                      <Sparkles className="size-3 inline mr-1" />{s.slice(0, 32)}…
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Nachricht schreiben…" className="h-11 flex-1" />
                  <button onClick={handleSend} className="size-11 grid place-items-center rounded-lg bg-gradient-brand text-white shadow-glow shrink-0">
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Wähle einen Chat</div>
          )}
        </Card>

        {/* Tools */}
        <Card className={`lg:col-span-3 p-4 overflow-y-auto ${mobileView === "chat" ? "hidden lg:block" : "hidden lg:block"}`}>
          <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Megaphone className="size-4 text-primary" /> Mass Messages
          </h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-elevated border border-border">
              <div className="text-xs text-muted-foreground">Aktive Kampagne</div>
              <div className="font-medium text-sm mt-1">Weekend VIP Drop</div>
              <div className="text-xs text-muted-foreground mt-1">312 / 480 versendet</div>
              <div className="h-1.5 rounded-full bg-secondary mt-2 overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-brand" />
              </div>
            </div>
            <Btn variant="brand" size="md" className="w-full" onClick={() => setMassOpen(true)}><Plus className="size-4" /> Neue Kampagne</Btn>
          </div>

          <h2 className="font-display font-semibold mt-6 mb-3 flex items-center gap-2">
            <FileText className="size-4 text-cyan" /> Vorlagen
          </h2>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => { setDraft(t.text); toast.success("Vorlage eingefügt"); }}
                className="w-full text-left p-3 rounded-lg bg-elevated border border-border text-sm hover:border-primary/40 transition">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.text}</div>
              </button>
            ))}
          </div>

          <h2 className="font-display font-semibold mt-6 mb-3 flex items-center gap-2">
            <Bot className="size-4 text-success" /> Auto-Responder
          </h2>
          <Btn variant="outline" size="sm" className="w-full mb-2" onClick={() => setAutoOpen(true)}>Regeln bearbeiten</Btn>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-elevated border border-border">
              <div className="font-medium">Tip &gt; 50€ → Personal Thanks</div>
              <div className="text-muted-foreground mt-1">aktiv · 24 Trigger heute</div>
            </div>
            <div className="p-3 rounded-lg bg-elevated border border-border">
              <div className="font-medium">Neuer Sub → Welcome Bundle</div>
              <div className="text-muted-foreground mt-1">aktiv · 8 Trigger heute</div>
            </div>
          </div>
        </Card>
      </div>

      {massOpen && <MassComposer onClose={() => setMassOpen(false)} />}
      {autoOpen && <AutoResponderEditor onClose={() => setAutoOpen(false)} />}
    </AppShell>
  );
}

function FanBubble({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex">
      <div>
        <div className="max-w-[260px] sm:max-w-[420px] p-3 rounded-2xl rounded-tl-sm bg-elevated border border-border text-sm">{text}</div>
        <div className="text-[10px] text-muted-foreground mt-1">{time}</div>
      </div>
    </div>
  );
}
function ChatterBubble({ text, time, ai }: { text: string; time: string; ai?: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[260px] sm:max-w-[420px]">
        <div className="p-3 rounded-2xl rounded-tr-sm bg-gradient-brand text-white text-sm shadow-glow">{text}</div>
        <div className="text-[10px] text-muted-foreground mt-1 text-right flex items-center gap-1 justify-end">
          {ai && <><Sparkles className="size-3" /> AI · </>}{time}
        </div>
      </div>
    </div>
  );
}

function MassComposer({ onClose }: { onClose: () => void }) {
  const creators = useStore((s) => s.creators);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [audience, setAudience] = useState<"all" | "vip" | "active" | "renewing">("vip");
  const [ppv, setPpv] = useState("");

  const reach = audience === "all" ? 2480 : audience === "vip" ? 312 : audience === "active" ? 1840 : 420;

  return (
    <Modal open onClose={onClose} title="Neue Mass-Kampagne" size="lg"
      footer={<>
        <Btn variant="outline" onClick={onClose}>Abbrechen</Btn>
        <Btn variant="brand" onClick={() => {
          if (!name.trim() || !text.trim()) return toast.error("Name und Text nötig");
          toast.success(`Kampagne „${name}" geplant — geht an ~${reach} Fans`);
          onClose();
        }}><Send className="size-4" /> Versenden</Btn>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Kampagnen-Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekend VIP Drop" autoFocus /></Field>
        <Field label="Creator">
          <Select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
            {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Zielgruppe">
          <Select value={audience} onChange={(e) => setAudience(e.target.value as "all" | "vip" | "active" | "renewing")}>
            <option value="all">Alle Fans (2.480)</option>
            <option value="vip">VIP Tier (312)</option>
            <option value="active">Active subs (1.840)</option>
            <option value="renewing">Auto-Renew (420)</option>
          </Select>
        </Field>
        <Field label="PPV Preis (optional, €)"><Input type="number" value={ppv} onChange={(e) => setPpv(e.target.value)} placeholder="25" /></Field>
        <div className="sm:col-span-2">
          <Field label="Nachricht">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="h-28" placeholder="Hey love, hab was Neues für dich…" />
          </Field>
        </div>
        <div className="sm:col-span-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
          📊 Geschätzte Reichweite: <b>{reach}</b> Fans · Erwarteter Revenue: <b>€{(reach * 0.12 * (Number(ppv) || 15)).toFixed(0)}</b>
        </div>
      </div>
    </Modal>
  );
}

function AutoResponderEditor({ onClose }: { onClose: () => void }) {
  const [rules, setRules] = useState([
    { id: "1", trigger: "Tip > 50€", reply: "OMG du bist der Beste 💕 hier ist ein kleines Dankeschön nur für dich…", active: true },
    { id: "2", trigger: "Neuer Sub", reply: "Welcome to the club baby 🥂 schau mal in deine DMs für dein Welcome Bundle", active: true },
    { id: "3", trigger: "PPV unopened > 24h", reply: "Hey hast du die DM gesehen? Ich glaub die wirst du lieben 😘", active: false },
  ]);
  const update = (i: number, patch: Partial<typeof rules[number]>) => setRules((s) => s.map((r, j) => j === i ? { ...r, ...patch } : r));

  return (
    <Modal open onClose={onClose} title="Auto-Responder Regeln" size="lg"
      footer={<Btn variant="brand" onClick={() => { toast.success("Regeln gespeichert"); onClose(); }}><Check className="size-4" /> Speichern</Btn>}>
      <div className="space-y-3">
        {rules.map((r, i) => (
          <div key={r.id} className="p-4 rounded-lg bg-elevated border border-border space-y-2">
            <div className="flex items-center justify-between">
              <Input value={r.trigger} onChange={(e) => update(i, { trigger: e.target.value })} className="w-auto flex-1 mr-3 font-medium" />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={r.active} onChange={(e) => update(i, { active: e.target.checked })} className="accent-pink-500" />
                aktiv
              </label>
            </div>
            <Textarea value={r.reply} onChange={(e) => update(i, { reply: e.target.value })} className="h-16" />
          </div>
        ))}
      </div>
    </Modal>
  );
}
