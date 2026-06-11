import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Modal, Field, Input, Select, Textarea } from "@/components/AppShell";
import { CreatorAvatar } from "@/components/CreatorAvatar";
import { useStore } from "@/lib/store";
import { useCreators } from "@/hooks/useCreators";
import { useAiReply, useAiStatus, useAiMassMessage } from "@/hooks/useAi";
import { useSyncOnlyFansChats } from "@/hooks/useOnlyFansChats";
import { useSendOnlyFansMessage } from "@/hooks/useOnlyFansSend";
import { useOnlyFansStats } from "@/hooks/useOnlyFansStats";
import { onlyFansProfileUrl } from "@/lib/onlyfans";
import { proxyOfMedia } from "@/lib/ofMedia";
import type { ChatMedia } from "@/lib/store";
import { Sparkles, Megaphone, FileText, Bot, ArrowLeft, Pin, Plus, Search, Copy, Send, ExternalLink, ShieldAlert, Loader2, RefreshCw, Check, FlaskConical, Lock, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { KI_TEST_CHAT_ID, createKiTestChat } from "@/lib/kiTestChat";
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

function Messaging() {
  const conversations = useStore((s) => s.conversations);
  const { data: creators = [] } = useCreators();
  const { data: aiStatus } = useAiStatus();
  const { data: ofStats } = useOnlyFansStats();
  const aiReply = useAiReply();
  const syncChats = useSyncOnlyFansChats();
  const sendOf = useSendOnlyFansMessage();
  const send = useStore((s) => s.sendMessage);
  const addConversation = useStore((s) => s.addConversation);
  const mergeConversations = useStore((s) => s.mergeConversations);
  const markRead = useStore((s) => s.markRead);

  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "");
  const [filter, setFilter] = useState<"Alle" | "DM" | "PPV" | "Mass">("Alle");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [massOpen, setMassOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);

  useEffect(() => {
    const defaultCreator = creators[0]?.id;
    if (!defaultCreator) return;
    if (conversations.some((c) => c.id === KI_TEST_CHAT_ID)) return;
    mergeConversations([createKiTestChat(defaultCreator)]);
    if (!activeId) setActiveId(KI_TEST_CHAT_ID);
  }, [creators, conversations, mergeConversations, activeId]);

  const filtered = useMemo(() => {
    const list = conversations.filter(
      (c) =>
        (filter === "Alle" || c.channel === filter) &&
        (!search || c.fan.toLowerCase().includes(search.toLowerCase())),
    );
    return [...list].sort((a, b) => {
      if (a.id === KI_TEST_CHAT_ID) return -1;
      if (b.id === KI_TEST_CHAT_ID) return 1;
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [conversations, filter, search]);

  const conv = conversations.find((c) => c.id === activeId);
  const creator = conv
    ? creators.find((c) => c.id === conv.creatorId) ?? creators[0] ?? null
    : null;
  const isKiTestChat = conv?.id === KI_TEST_CHAT_ID;

  const ofChatId = conv?.ofChatId ?? (conv?.id.startsWith("of-") ? conv.id.replace(/^of-/, "") : null);
  const canSendToOf = Boolean(ofStats?.connected && ofChatId && !isKiTestChat);

  const handleSend = async () => {
    if (!draft.trim() || !conv) return;

    if (canSendToOf && ofChatId) {
      try {
        const result = await sendOf.mutateAsync({
          chatId: ofChatId,
          text: draft.trim(),
          creatorId: conv.creatorId,
        });
        send(conv.id, result.message.text, "creator");
        setDraft("");
        setAiSuggestions([]);
        toast.success(`Gesendet an ${conv.fan} via OnlyFans`);
        return;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "OF-Senden fehlgeschlagen");
        return;
      }
    }

    navigator.clipboard.writeText(draft);
    send(conv.id, draft);
    setDraft("");
    toast.success("In Zwischenablage — manuell auf OnlyFans senden");
  };

  const openChat = (id: string) => {
    setActiveId(id);
    markRead(id);
    setMobileView("chat");
    setAiSuggestions([]);
  };

  const setTestChatCreator = (creatorId: string) => {
    if (!conv || conv.id !== KI_TEST_CHAT_ID) return;
    mergeConversations([{ ...conv, creatorId }]);
  };

  const requestAiReply = async () => {
    if (!conv) return;
    const persona = creators.find((c) => c.id === conv.creatorId) ?? creators[0];
    if (!persona) {
      toast.error("Lege zuerst einen Creator an");
      return;
    }
    const lastFan = [...conv.messages].reverse().find((m) => m.from === "fan");
    if (!lastFan) {
      toast.error("Keine Fan-Nachricht — warte auf eine eingehende DM");
      return;
    }
    if (!aiStatus?.configured) {
      toast.error("KI nicht konfiguriert — AI_API_KEY in .env setzen");
      return;
    }
    try {
      const suggestions = await aiReply.mutateAsync({
        creatorName: persona.name,
        creatorHandle: persona.handle,
        niche: persona.niche,
        creatorNotes: persona.notes,
        fanName: conv.fan,
        fanHandle: conv.fanHandle,
        spend: conv.spend,
        channel: conv.channel,
        messages: conv.messages,
      });
      setAiSuggestions(suggestions);
      if (suggestions[0]) setDraft(suggestions[0]);
      toast.success("3 KI-Antworten bereit — wähle oder bearbeite");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "KI fehlgeschlagen");
    }
  };

  const openKiTestChat = () => {
    if (!creators.length) {
      toast.error("Lege zuerst einen Creator an — KI braucht eine Persona");
      return;
    }
    if (!conversations.some((c) => c.id === KI_TEST_CHAT_ID)) {
      mergeConversations([createKiTestChat(creators[0].id)]);
    }
    setActiveId(KI_TEST_CHAT_ID);
    setMobileView("chat");
  };

  const pullFromOnlyFans = async (filter: "unread" | "recent" | "all" = "recent") => {
    try {
      const result = await syncChats.mutateAsync({ filter, limit: 30 });
      if (result.conversations.length) {
        mergeConversations(result.conversations);
        setActiveId(result.conversations[0].id);
        setMobileView("chat");
      }
      toast.success(result.message ?? `${result.synced} Chats geladen`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "OF-Sync fehlgeschlagen");
    }
  };

  return (
    <AppShell
      fill
      title="Messaging Hub"
      subtitle="Assisted Inbox · OnlyFans Sync · KI-Antworten"
      actions={
        <div className="flex items-center gap-2">
          <Btn variant="ghost" onClick={openKiTestChat} disabled={!creators.length}>
            <FlaskConical className="size-4" />
            KI testen
          </Btn>
          {ofStats?.connected ? (
            <>
              <Btn variant="ghost" onClick={() => pullFromOnlyFans("recent")} disabled={syncChats.isPending}>
                {syncChats.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                OF Chats
              </Btn>
              <Btn variant="ghost" onClick={() => pullFromOnlyFans("all")} disabled={syncChats.isPending}>
                Alle Chats
              </Btn>
            </>
          ) : undefined}
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 py-4 lg:py-5 gap-3 lg:gap-4">
      <Card className="shrink-0 px-4 py-3 border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
        <ShieldAlert className="size-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          {ofStats?.connected ? (
            <>
              <strong className="text-foreground">OF verbunden:</strong> Sync-Chats laden Bilder & Nachrichten.
              Bei OF-Chats kannst du direkt aus Lumina antworten — kein Auto-Responder, du bestätigst jede Nachricht.
            </>
          ) : (
            <>
              <strong className="text-foreground">Assisted Mode:</strong> Verbinde OnlyFans in Settings um Chats zu syncen und direkt zu antworten.
            </>
          )}
        </p>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0">
        {/* Inbox */}
        <Card className={`lg:col-span-4 p-0 flex flex-col overflow-hidden ${mobileView === "chat" ? "hidden lg:flex" : "flex"}`}>
          <div className="p-3 lg:p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Inbox</h2>
              <div className="flex items-center gap-2">
                <Badge tone="magenta">{conversations.reduce((s, c) => s + c.unread, 0)} neu</Badge>
                <button
                  type="button"
                  onClick={() => setNewChatOpen(true)}
                  className="size-8 grid place-items-center rounded-lg border border-border bg-elevated hover:bg-secondary"
                  title="Chat hinzufügen"
                >
                  <Plus className="size-4" />
                </button>
              </div>
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
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Keine Chats — füge eine Fan-Nachricht hinzu oder sync später via OnlyFansAPI
              </div>
            )}
            {filtered.map((m) => {
              const c = creators.find((cr) => cr.id === m.creatorId);
              const isTest = m.id === KI_TEST_CHAT_ID;
              return (
                <button key={m.id} onClick={() => openChat(m.id)}
                  className={`w-full text-left p-3 lg:p-4 border-b border-border flex gap-3 hover:bg-elevated/60 transition ${activeId === m.id ? "bg-elevated/80" : ""} ${isTest ? "bg-primary/5" : ""}`}>
                  <div className="relative shrink-0">
                    {c ? (
                      <CreatorAvatar src={c.avatar} name={c.name} className="size-10" rounded="full" />
                    ) : (
                      <div className="size-10 rounded-full bg-gradient-brand grid place-items-center text-white text-xs font-bold">KI</div>
                    )}
                    {m.unread > 0 && <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-[10px] font-bold text-white border-2 border-background">{m.unread}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        {m.pinned && <Pin className="size-3 text-primary" />}
                        {isTest && <FlaskConical className="size-3 text-primary" />}
                        {m.fan}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{isTest ? "Demo" : `€${m.spend}`}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{m.messages.at(-1)?.text}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {isTest ? (
                        <Badge tone="magenta">KI-Test</Badge>
                      ) : (
                        <Badge tone="info">{c?.name?.split(" ")[0] ?? "Creator"}</Badge>
                      )}
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
          {conv ? (
            <>
              <div className="p-3 lg:p-4 border-b border-border flex items-center gap-3">
                <button onClick={() => setMobileView("list")} className="lg:hidden size-9 grid place-items-center rounded-lg hover:bg-elevated"><ArrowLeft className="size-4" /></button>
                {creator ? (
                  <CreatorAvatar src={creator.avatar} name={creator.name} className="size-10" rounded="full" />
                ) : (
                  <div className="size-10 rounded-full bg-gradient-brand grid place-items-center text-white text-xs font-bold">KI</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {conv.fan}
                    {isKiTestChat && <Badge tone="magenta">Sandbox</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {isKiTestChat
                      ? "Simulierter Fan-Chat — KI ohne OnlyFans testen"
                      : `via ${creator?.name ?? "Creator"} · Total spent €${conv.spend}`}
                  </div>
                </div>
                {isKiTestChat && creators.length > 0 ? (
                  <Select
                    value={conv.creatorId || creators[0]?.id}
                    onChange={(e) => setTestChatCreator(e.target.value)}
                    className="h-8 text-xs max-w-[140px]"
                  >
                    {creators.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone="info"><Sparkles className="size-3" /> Assisted</Badge>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/40">
                {conv.messages.map((m) =>
                  m.from === "fan"
                    ? <FanBubble key={m.id} text={m.text} time={m.time} media={m.media} />
                    : <ChatterBubble key={m.id} text={m.text} time={m.time} ai={m.from === "ai"} media={m.media} />
                )}
              </div>
              <div className="p-3 lg:p-4 border-t border-border space-y-2">
                {aiSuggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Sparkles className="size-3 text-primary" /> KI-Vorschläge
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                      {aiSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDraft(s)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition ${draft === s ? "bg-primary/15 border-primary/40 text-primary" : "bg-primary/5 border-primary/20 hover:bg-primary/10"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={requestAiReply}
                    disabled={aiReply.isPending || !aiStatus?.configured}
                    title={aiStatus?.configured ? "KI-Antwort generieren" : "AI_API_KEY in .env fehlt"}
                    className="size-11 grid place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition shrink-0 disabled:opacity-40"
                  >
                    {aiReply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  </button>
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !sendOf.isPending && handleSend()}
                    placeholder={canSendToOf ? "Nachricht an Fan senden…" : "Nachricht schreiben…"}
                    className="h-11 flex-1"
                    disabled={sendOf.isPending} />
                  <button
                    onClick={handleSend}
                    disabled={sendOf.isPending || !draft.trim()}
                    title={canSendToOf ? "Direkt an OnlyFans senden" : "In Zwischenablage kopieren"}
                    className="size-11 grid place-items-center rounded-lg bg-gradient-brand text-white shadow-glow shrink-0 disabled:opacity-50"
                  >
                    {sendOf.isPending ? <Loader2 className="size-4 animate-spin" /> : canSendToOf ? <Send className="size-4" /> : <Copy className="size-4" />}
                  </button>
                </div>
                {!aiStatus?.configured && (
                  <p className="text-[10px] text-muted-foreground">KI: AI_API_KEY in .env setzen (Settings → Integrations)</p>
                )}
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
              <div className="text-xs text-muted-foreground">Letzte Vorlage (lokal)</div>
              <div className="font-medium text-sm mt-1">Weekend VIP Drop</div>
              <div className="text-xs text-muted-foreground mt-1">Bereit zum manuellen Versand auf OF</div>
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
            <Bot className="size-4 text-muted-foreground" /> Auto-Responder
          </h2>
          <p className="text-xs text-amber-500 mb-2">Deaktiviert (ToS-Schutz). Nutze Vorlagen + manuelles Senden.</p>
          <Btn variant="outline" size="sm" className="w-full mb-2 opacity-50" disabled onClick={() => setAutoOpen(true)}>
            Regeln (deaktiviert)
          </Btn>
        </Card>
      </div>
      </div>

      {massOpen && <MassComposer onClose={() => setMassOpen(false)} />}
      {autoOpen && <AutoResponderEditor onClose={() => setAutoOpen(false)} />}
      {newChatOpen && (
        <NewChatModal
          creators={creators}
          onClose={() => setNewChatOpen(false)}
          onCreate={(data) => {
            const id = addConversation(data);
            openChat(id);
            setNewChatOpen(false);
            toast.success("Chat angelegt — KI-Button für Antwortvorschlag");
          }}
        />
      )}
    </AppShell>
  );
}

function MessageMedia({ media }: { media?: ChatMedia[] }) {
  if (!media?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {media.map((m, i) => (
        <div key={i} className="relative rounded-lg overflow-hidden border border-border/50 max-w-[180px]">
          {m.type === "video" ? (
            <div className="relative">
              <img src={proxyOfMedia(m.thumbUrl ?? m.url)} alt="" className="w-full max-h-32 object-cover" loading="lazy" />
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <Play className="size-6 text-white" />
              </div>
            </div>
          ) : (
            <a href={proxyOfMedia(m.url)} target="_blank" rel="noopener noreferrer">
              <img src={proxyOfMedia(m.thumbUrl ?? m.url)} alt="" className="w-full max-h-32 object-cover" loading="lazy" />
            </a>
          )}
          {m.locked && (
            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white flex items-center gap-0.5">
              <Lock className="size-2.5" /> {m.price ? `€${m.price}` : "PPV"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FanBubble({ text, time, media }: { text: string; time: string; media?: ChatMedia[] }) {
  return (
    <div className="flex">
      <div>
        <div className="max-w-[260px] sm:max-w-[420px] p-3 rounded-2xl rounded-tl-sm bg-elevated border border-border text-sm">
          {text && <span>{text}</span>}
          <MessageMedia media={media} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">{time}</div>
      </div>
    </div>
  );
}

function ChatterBubble({ text, time, ai, media }: { text: string; time: string; ai?: boolean; media?: ChatMedia[] }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[260px] sm:max-w-[420px]">
        <div className="p-3 rounded-2xl rounded-tr-sm bg-gradient-brand text-white text-sm shadow-glow">
          {text && <span>{text}</span>}
          <MessageMedia media={media} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 text-right flex items-center gap-1 justify-end">
          {ai && <><Sparkles className="size-3" /> AI · </>}{time}
        </div>
      </div>
    </div>
  );
}

function MassComposer({ onClose }: { onClose: () => void }) {
  const { data: creators = [] } = useCreators();
  const { data: aiStatus } = useAiStatus();
  const aiMass = useAiMassMessage();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [audience, setAudience] = useState<"all" | "vip" | "active" | "renewing">("vip");
  const [ppv, setPpv] = useState("");

  const reach = audience === "all" ? 2480 : audience === "vip" ? 312 : audience === "active" ? 1840 : 420;
  const reachLabel = `~${reach} Fans (Demo-Schätzung)`;
  const creator = creators.find((c) => c.id === creatorId);

  const generateWithAi = async () => {
    if (!creator) return toast.error("Creator wählen");
    if (!aiStatus?.configured) return toast.error("AI_API_KEY in .env setzen");
    try {
      const message = await aiMass.mutateAsync({
        creatorName: creator.name,
        niche: creator.niche,
        campaignName: name || "VIP Drop",
        audience,
        ppvPrice: ppv ? Number(ppv) : undefined,
      });
      setText(message);
      toast.success("KI-Mass-DM eingefügt — prüfe und passe an");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "KI fehlgeschlagen");
    }
  };

  return (
    <Modal open onClose={onClose} title="Mass-Nachricht — Assisted" size="lg"
      footer={<>
        <Btn variant="outline" onClick={onClose}>Abbrechen</Btn>
        <Btn variant="outline" onClick={() => {
          const creator = creators.find((c) => c.id === creatorId);
          const url = onlyFansProfileUrl(creator?.handle, creator?.onlyfansUrl);
          window.open(url, "_blank", "noopener,noreferrer");
          toast.info("OnlyFans geöffnet — sende die Nachricht manuell");
        }}><ExternalLink className="size-4" /> OnlyFans öffnen</Btn>
        <Btn variant="brand" onClick={() => {
          if (!name.trim() || !text.trim()) return toast.error("Name und Text nötig");
          const bundle = `Kampagne: ${name}\nZielgruppe: ${audience} (~${reach} Fans)\n${ppv ? `PPV: €${ppv}\n` : ""}\n${text}`;
          navigator.clipboard.writeText(bundle);
          toast.success(`Text kopiert — sende manuell an ~${reach} Fans auf OnlyFans`);
          onClose();
        }}><Copy className="size-4" /> In Zwischenablage</Btn>
      </>}>
      <p className="text-xs text-amber-500 mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        Kein Auto-Send. Du kopierst den Text und versendest selbst auf OnlyFans — Segment für Segment empfohlen.
      </p>
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
          <Btn
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={generateWithAi}
            disabled={aiMass.isPending || !aiStatus?.configured}
          >
            {aiMass.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Mit KI generieren
          </Btn>
        </div>
        <div className="sm:col-span-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
          📊 {reachLabel} · Demo-Revenue-Schätzung: <b>€{(reach * 0.12 * (Number(ppv) || 15)).toFixed(0)}</b>
        </div>
      </div>
    </Modal>
  );
}

function NewChatModal({
  creators,
  onClose,
  onCreate,
}: {
  creators: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (data: {
    creatorId: string;
    fan: string;
    fanHandle: string;
    channel: "DM" | "PPV" | "Mass";
    spend: number;
    message: string;
  }) => void;
}) {
  const [fan, setFan] = useState("");
  const [fanHandle, setFanHandle] = useState("");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [spend, setSpend] = useState("0");
  const [channel, setChannel] = useState<"DM" | "PPV" | "Mass">("DM");

  return (
    <Modal
      open
      onClose={onClose}
      title="Fan-Nachricht hinzufügen"
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>Abbrechen</Btn>
          <Btn variant="brand" onClick={() => {
            if (!fan.trim() || !message.trim() || !creatorId) return toast.error("Fan, Creator und Nachricht nötig");
            onCreate({
              creatorId,
              fan: fan.trim(),
              fanHandle: fanHandle.trim() || `@${fan.trim().toLowerCase().replace(/\s+/g, "")}`,
              channel,
              spend: Number(spend) || 0,
              message: message.trim(),
            });
          }}><Check className="size-4" /> Anlegen</Btn>
        </>
      }
    >
      <p className="text-xs text-muted-foreground mb-4">
        Für Assisted Inbox: Fan-Nachricht von OnlyFans hier einfügen, dann KI-Antwort generieren.
      </p>
      <div className="space-y-3">
        <Field label="Creator">
          <Select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
            {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fan-Name"><Input value={fan} onChange={(e) => setFan(e.target.value)} placeholder="Big Tipper" autoFocus /></Field>
          <Field label="Handle"><Input value={fanHandle} onChange={(e) => setFanHandle(e.target.value)} placeholder="@fan123" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kanal">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as "DM" | "PPV" | "Mass")}>
              <option value="DM">DM</option>
              <option value="PPV">PPV</option>
              <option value="Mass">Mass</option>
            </Select>
          </Field>
          <Field label="Spend (€)"><Input type="number" value={spend} onChange={(e) => setSpend(e.target.value)} /></Field>
        </div>
        <Field label="Fan-Nachricht">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="h-24" placeholder="Hey love, got anything new today? 💕" />
        </Field>
      </div>
    </Modal>
  );
}

function AutoResponderEditor({ onClose }: { onClose: () => void }) {
  const [rules, setRules] = useState([
    { id: "1", trigger: "Tip > 50€", reply: "OMG du bist der Beste 💕 hier ist ein kleines Dankeschön nur für dich…", active: false },
    { id: "2", trigger: "Neuer Sub", reply: "Welcome to the club baby 🥂 schau mal in deine DMs für dein Welcome Bundle", active: false },
    { id: "3", trigger: "PPV unopened > 24h", reply: "Hey hast du die DM gesehen? Ich glaub die wirst du lieben 😘", active: false },
  ]);
  const update = (i: number, patch: Partial<typeof rules[number]>) => setRules((s) => s.map((r, j) => j === i ? { ...r, ...patch } : r));

  return (
    <Modal open onClose={onClose} title="Auto-Responder (deaktiviert)" size="lg"
      footer={<Btn variant="outline" onClick={onClose}>Schließen</Btn>}>
      <p className="text-xs text-amber-500 mb-4">Auto-Responder verletzen die OnlyFans-ToS. Nutze stattdessen Vorlagen im Chat.</p>
      <div className="space-y-3">
        {rules.map((r, i) => (
          <div key={r.id} className="p-4 rounded-lg bg-elevated border border-border space-y-2">
            <div className="flex items-center justify-between">
              <Input value={r.trigger} onChange={(e) => update(i, { trigger: e.target.value })} className="w-auto flex-1 mr-3 font-medium" />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={false} disabled className="accent-pink-500 opacity-50" />
                deaktiviert
              </label>
            </div>
            <Textarea value={r.reply} onChange={(e) => update(i, { reply: e.target.value })} className="h-16" />
          </div>
        ))}
      </div>
    </Modal>
  );
}
