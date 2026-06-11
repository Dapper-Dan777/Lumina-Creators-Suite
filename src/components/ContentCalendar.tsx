import { useMemo, useState } from "react";
import { Card, Badge, Btn, Modal, Field, Input, Select } from "@/components/AppShell";
import { useContent, useContentMutations } from "@/hooks/useContent";
import { useCreators } from "@/hooks/useCreators";
import { isPostableToday } from "@/components/PostingAssistant";
import { type ContentItem, type ContentStatus } from "@/lib/store";
import {
  Send, Loader2, ChevronLeft, ChevronRight, Plus, Filter,
  FileEdit, Clock, CheckCircle2, Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const TYPE_META: Record<ContentItem["type"], { label: string; color: string; bg: string }> = {
  Post: { label: "Post", color: "text-cyan", bg: "bg-cyan/25" },
  PPV: { label: "PPV", color: "text-primary", bg: "bg-primary/25" },
  Video: { label: "Video", color: "text-warning", bg: "bg-warning/25" },
  Story: { label: "Story", color: "text-success", bg: "bg-success/25" },
};

const STATUS_META: Record<ContentStatus, { label: string; icon: typeof FileEdit }> = {
  draft: { label: "Draft", icon: FileEdit },
  pending: { label: "Pending", icon: Clock },
  approved: { label: "Approved", icon: CheckCircle2 },
  scheduled: { label: "Geplant", icon: CalendarIcon },
  published: { label: "Live", icon: CheckCircle2 },
};

const PRESETS = [
  { id: "feed", label: "Feed Post", type: "Post" as const, title: "Feed Drop", time: "12:00", status: "scheduled" as const },
  { id: "ppv", label: "PPV Drop", type: "PPV" as const, title: "Exclusive PPV", time: "20:00", price: 25, status: "scheduled" as const },
  { id: "story", label: "Story", type: "Story" as const, title: "Story Teaser", time: "18:00", status: "scheduled" as const },
  { id: "video", label: "Video", type: "Video" as const, title: "New Video", time: "21:00", status: "scheduled" as const },
  { id: "morning", label: "Morgen-Post", type: "Post" as const, title: "Good Morning", time: "09:00", status: "scheduled" as const },
  { id: "weekend", label: "Weekend Bundle", type: "PPV" as const, title: "Weekend Bundle", time: "19:00", price: 35, status: "scheduled" as const },
];

type Props = { onPostToday: (item: ContentItem) => void };

export function ContentCalendar({ onPostToday }: Props) {
  const { data: content = [] } = useContent();
  const { data: creators = [] } = useCreators();
  const { update, create, remove } = useContentMutations();

  const [drag, setDrag] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [creatorFilter, setCreatorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dayModal, setDayModal] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "Post" as ContentItem["type"],
    time: "12:00",
    price: "",
    caption: "",
    status: "scheduled" as ContentStatus,
    creatorId: "",
  });

  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = viewDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const filtered = useMemo(() => {
    let arr = content;
    if (creatorFilter) arr = arr.filter((c) => c.creatorId === creatorFilter);
    if (typeFilter) arr = arr.filter((c) => c.type === typeFilter);
    if (statusFilter) arr = arr.filter((c) => c.status === statusFilter);
    return arr;
  }, [content, creatorFilter, typeFilter, statusFilter]);

  const monthStats = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const inMonth = filtered.filter((c) => {
      const d = new Date(c.scheduledFor);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      total: inMonth.length,
      posts: inMonth.filter((c) => c.type === "Post").length,
      ppv: inMonth.filter((c) => c.type === "PPV").length,
      stories: inMonth.filter((c) => c.type === "Story").length,
    };
  }, [filtered, viewDate]);

  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((startPad + daysInMonth) / 7) * 7;

    return Array.from({ length: total }, (_, i) => {
      const dayNum = i - startPad + 1;
      const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const d = inMonth ? new Date(year, month, dayNum) : null;
      const iso = d ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` : "";
      const items = inMonth ? filtered.filter((c) => c.scheduledFor.slice(0, 10) === iso) : [];
      return { d, iso, items, inMonth };
    });
  }, [viewDate, filtered]);

  const cName = (id: string) => creators.find((c) => c.id === id)?.name.split(" ")[0] ?? "?";
  const cInitials = (id: string) => {
    const n = creators.find((c) => c.id === id)?.name ?? "?";
    return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const openDay = (iso: string) => {
    setDayModal(iso);
    setForm({
      title: "",
      type: "Post",
      time: "12:00",
      price: "",
      caption: "",
      status: "scheduled",
      creatorId: creatorFilter || creators[0]?.id || "",
    });
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    if (!dayModal) return;
    setForm({
      title: preset.title,
      type: preset.type,
      time: preset.time,
      price: preset.price ? String(preset.price) : "",
      caption: "",
      status: preset.status,
      creatorId: creatorFilter || creators[0]?.id || "",
    });
  };

  const addToDay = () => {
    if (!dayModal || !form.title.trim()) return toast.error("Titel fehlt");
    const cid = form.creatorId || creators[0]?.id;
    if (!cid) return toast.error("Creator wählen");
    create.mutate({
      creatorId: cid,
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      scheduledFor: new Date(`${dayModal}T${form.time}:00`).toISOString(),
      cover: "linear-gradient(135deg,#ff2d8a,#00f0ff)",
      caption: form.caption,
      price: form.price ? Number(form.price) : undefined,
    }, {
      onSuccess: () => { toast.success("Eingetragen"); setDayModal(null); },
    });
  };

  const dayItems = dayModal ? content.filter((c) => c.scheduledFor.slice(0, 10) === dayModal) : [];

  return (
    <Card className="p-3 lg:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" onClick={() => setMonthOffset((m) => m - 1)} className="size-9 grid place-items-center rounded-lg border border-border hover:border-primary/40">
          <ChevronLeft className="size-4" />
        </button>
        <h3 className="font-display font-semibold min-w-[160px] text-center capitalize">{monthLabel}</h3>
        <button type="button" onClick={() => setMonthOffset((m) => m + 1)} className="size-9 grid place-items-center rounded-lg border border-border hover:border-primary/40">
          <ChevronRight className="size-4" />
        </button>
        <button type="button" onClick={() => setMonthOffset(0)} className="px-3 h-9 rounded-lg text-xs border border-border hover:border-primary/40">Heute</button>
        <div className="hidden sm:flex gap-1.5 ml-2">
          <Badge tone="info">{monthStats.total} geplant</Badge>
          <Badge tone="magenta">{monthStats.posts} Posts</Badge>
          <Badge tone="warning">{monthStats.ppv} PPV</Badge>
          <Badge tone="success">{monthStats.stories} Stories</Badge>
        </div>
      </div>

      {/* Filters + Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} className="h-8 w-36 text-xs">
          <option value="">Alle Creator</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 w-28 text-xs">
          <option value="">Alle Typen</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 w-32 text-xs">
          <option value="">Alle Status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <div className="flex flex-wrap gap-2 ml-auto">
          {Object.entries(TYPE_META).map(([type, meta]) => (
            <span key={type} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
              <span className="size-1.5 rounded-full bg-current" /> {meta.label}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1.5 lg:gap-2">
        {DAYS.map((d) => <div key={d} className="text-xs font-medium text-muted-foreground text-center pb-2">{d}</div>)}
        {cells.map((c, i) => {
          if (!c.inMonth || !c.d) return <div key={i} className="min-h-[80px] lg:min-h-[110px]" />;
          const today = c.iso === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || drag;
                if (id) {
                  update.mutate({ id, scheduledFor: new Date(`${c.iso}T12:00:00`).toISOString(), status: "scheduled" });
                  toast.success(`→ ${c.d.toLocaleDateString("de-DE")}`);
                }
                setDrag(null);
              }}
              onClick={() => openDay(c.iso)}
              className={`min-h-[80px] lg:min-h-[110px] p-1.5 lg:p-2 rounded-lg border transition cursor-pointer group ${
                today ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20" : "bg-elevated border-border hover:border-primary/30"
              }`}
            >
              <div className={`text-[10px] lg:text-xs mb-1 flex justify-between items-center ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                <span>{c.d.getDate()}</span>
                <div className="flex items-center gap-1">
                  {c.items.length > 0 && (
                    <span className="text-[9px] px-1 rounded bg-white/10">{c.items.length}</span>
                  )}
                  <button
                    type="button"
                    title="Hinzufügen"
                    onClick={(e) => { e.stopPropagation(); openDay(c.iso); }}
                    className="opacity-0 group-hover:opacity-100 size-4 grid place-items-center rounded bg-primary/20 text-primary"
                  >
                    <Plus className="size-2.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                {c.items.slice(0, 3).map((it) => {
                  const meta = TYPE_META[it.type];
                  return (
                    <div key={it.id} className="flex items-center gap-0.5">
                      <div
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("text/plain", it.id); setDrag(it.id); }}
                        onDragEnd={() => setDrag(null)}
                        onClick={() => onPostToday(it)}
                        title={`${it.type} · ${it.title} · ${STATUS_META[it.status]?.label ?? it.status}`}
                        className={`flex-1 min-w-0 text-[9px] lg:text-[10px] px-1 py-0.5 rounded truncate cursor-grab hover:ring-1 hover:ring-primary/40 flex items-center gap-0.5 ${meta.bg} ${meta.color}`}
                      >
                        <span className="shrink-0 font-bold opacity-70">{cInitials(it.creatorId)}</span>
                        <span className="truncate">{meta.label} · {it.title}</span>
                      </div>
                      {isPostableToday(it) && (
                        <button type="button" title="Posten" onClick={() => onPostToday(it)} className="shrink-0 size-5 grid place-items-center rounded bg-gradient-brand text-white">
                          <Send className="size-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {c.items.length > 3 && <div className="text-[9px] text-muted-foreground">+{c.items.length - 3} mehr</div>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Tag klicken = planen · Voreinstellungen im Modal · Drag&Drop verschieben · Chip = Posting Assistant
      </p>

      <Modal
        open={!!dayModal}
        onClose={() => setDayModal(null)}
        title={dayModal ? new Date(`${dayModal}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) : ""}
        size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDayModal(null)}>Schließen</Btn>
            <Btn variant="brand" onClick={addToDay} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Einplanen
            </Btn>
          </>
        }
      >
        {/* Presets */}
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-2">Voreinstellungen</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 h-7 rounded-md text-xs font-medium border transition ${TYPE_META[p.type].bg} ${TYPE_META[p.type].color} border-border hover:border-primary/40`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Titel">
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="z.B. Weekend PPV Drop" />
            </Field>
          </div>
          <Field label="Creator">
            <Select value={form.creatorId} onChange={(e) => setForm((f) => ({ ...f, creatorId: e.target.value }))}>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Typ">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContentItem["type"] }))}>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Uhrzeit">
            <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}>
              {(["draft", "pending", "approved", "scheduled"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </Select>
          </Field>
          {form.type === "PPV" && (
            <Field label="PPV Preis (€)">
              <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="25" />
            </Field>
          )}
          <div className="col-span-2">
            <Field label="Caption">
              <Input value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} placeholder="Optional…" />
            </Field>
          </div>
        </div>

        {dayItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">{dayItems.length} Einträge an diesem Tag</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {dayItems.map((it) => {
                const meta = TYPE_META[it.type];
                return (
                  <div key={it.id} className="text-xs p-2 rounded-lg bg-elevated border border-border flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <Badge tone="info">{cName(it.creatorId)}</Badge>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      <span className="truncate">{it.title}</span>
                      <span className="text-muted-foreground shrink-0">
                        {new Date(it.scheduledFor).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" className="text-primary hover:underline" onClick={() => { onPostToday(it); setDayModal(null); }}>Posten</button>
                      <button type="button" className="text-destructive hover:underline" onClick={() => remove.mutate(it.id, { onSuccess: () => toast.success("Entfernt") })}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}