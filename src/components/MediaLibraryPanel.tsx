import { useMemo, useState } from "react";
import { Card, Badge, Btn, Field, Select, Modal, Input } from "@/components/AppShell";
import {
  useMedia, useMediaCategories, useMediaFolders, useMediaMutations,
  type MediaItem, type MediaFolder,
} from "@/hooks/useMedia";
import { useCreators } from "@/hooks/useCreators";
import { pickImageFile } from "@/lib/fileUpload";
import { formatFileSize } from "@/lib/ofMedia";
import {
  Upload, Trash2, Loader2, ImageIcon, Pencil, FolderPlus, Folder,
  LayoutGrid, List, Search, ChevronRight, Home, SortAsc, SortDesc,
  FolderOpen, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  creatorId?: string;
  compact?: boolean;
};

type ViewMode = "grid" | "list";
type SortKey = "name" | "date" | "size";

export function MediaLibraryPanel({ creatorId: fixedCreatorId, compact }: Props) {
  const { data: creators = [] } = useCreators();
  const { data: categories = [] } = useMediaCategories();
  const [creatorFilter, setCreatorFilter] = useState(fixedCreatorId ?? "");
  const [folderId, setFolderId] = useState<string | "root">("root");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const creatorId = fixedCreatorId ?? creatorFilter;
  const { data: folders = [] } = useMediaFolders(
    creatorId ? { creatorId, parentId: folderId === "root" ? "root" : folderId } : undefined,
  );
  const { data: items = [], isLoading } = useMedia({
    creatorId: creatorId || undefined,
    folderId: search ? undefined : folderId,
    q: search || undefined,
  });
  const { upload, update, remove, createFolder, removeFolder } = useMediaMutations();

  const editItem = items.find((i) => i.id === editId);
  const selected = items.find((i) => i.id === selectedId);
  const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "size") cmp = a.fileSize - b.fileSize;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [items, sortKey, sortAsc]);

  const breadcrumb = useMemo(() => {
    const crumbs: { id: string | "root"; name: string }[] = [{ id: "root", name: "Meine Medien" }];
    if (folderId !== "root") {
      const f = folders.find((x) => x.id === folderId);
      if (f) crumbs.push({ id: f.id, name: f.name });
    }
    return crumbs;
  }, [folderId, folders]);

  const handleUpload = () => {
    const cid = creatorId || creators[0]?.id;
    if (!cid) return toast.error("Zuerst einen Creator anlegen");
    pickImageFile(async (dataUrl, file) => {
      try {
        await upload.mutateAsync({
          creatorId: cid,
          dataUrl,
          filename: file.name,
          category: "feed",
          title: file.name.replace(/\.[^.]+$/, ""),
          folderId: folderId === "root" ? null : folderId,
        });
        toast.success("Hochgeladen");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
      }
    });
  };

  const handleCreateFolder = async () => {
    const cid = creatorId || creators[0]?.id;
    if (!cid || !newFolderName.trim()) return toast.error("Name und Creator nötig");
    try {
      await createFolder.mutateAsync({
        creatorId: cid,
        name: newFolderName.trim(),
        parentId: folderId === "root" ? null : folderId,
      });
      toast.success("Ordner erstellt");
      setNewFolderOpen(false);
      setNewFolderName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ordner fehlgeschlagen");
    }
  };

  return (
    <Card className={`${compact ? "p-0 border-0 bg-transparent" : "p-0"} overflow-hidden`}>
      <div className={`flex ${compact ? "flex-col" : "flex-col lg:flex-row"} min-h-[420px]`}>
        {/* Sidebar — folders & categories */}
        {!compact && (
          <aside className="lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r border-border p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-2">Navigation</div>
            <NavBtn active={folderId === "root" && !search} onClick={() => { setFolderId("root"); setSearch(""); }}>
              <Home className="size-4" /> Alle Dateien
            </NavBtn>
            {creatorId && folders.map((f) => (
              <NavBtn key={f.id} active={folderId === f.id} onClick={() => { setFolderId(f.id); setSearch(""); }}>
                <Folder className="size-4" /> {f.name}
                <span className="ml-auto text-[10px] text-muted-foreground">{f._count?.assets ?? 0}</span>
              </NavBtn>
            ))}
            <div className="pt-3 mt-3 border-t border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-2">Kategorien</div>
              {categories.map((c) => (
                <NavBtn key={c.id} onClick={() => setSearch(c.label)}>
                  <ImageIcon className="size-3.5" /> {c.label}
                </NavBtn>
              ))}
            </div>
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
            {!fixedCreatorId && (
              <Select value={creatorFilter} onChange={(e) => { setCreatorFilter(e.target.value); setFolderId("root"); }} className="h-8 w-40 text-xs">
                <option value="">Creator wählen…</option>
                {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <Btn variant="brand" size="sm" onClick={handleUpload} disabled={upload.isPending || !creatorId}>
              {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Hochladen
            </Btn>
            <Btn variant="outline" size="sm" onClick={() => setNewFolderOpen(true)} disabled={!creatorId}>
              <FolderPlus className="size-4" /> Neuer Ordner
            </Btn>
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen…" className="h-8 pl-8 text-xs" />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button type="button" onClick={() => setSortAsc(!sortAsc)} className="size-8 grid place-items-center rounded-lg border border-border hover:border-primary/40" title="Sortierung">
                {sortAsc ? <SortAsc className="size-3.5" /> : <SortDesc className="size-3.5" />}
              </button>
              <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="h-8 w-24 text-xs">
                <option value="date">Datum</option>
                <option value="name">Name</option>
                <option value="size">Größe</option>
              </Select>
              <button type="button" onClick={() => setView("grid")} className={`size-8 grid place-items-center rounded-lg border ${view === "grid" ? "border-primary/40 bg-primary/10" : "border-border"}`}>
                <LayoutGrid className="size-3.5" />
              </button>
              <button type="button" onClick={() => setView("list")} className={`size-8 grid place-items-center rounded-lg border ${view === "list" ? "border-primary/40 bg-primary/10" : "border-border"}`}>
                <List className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="px-3 py-2 flex items-center gap-1 text-xs text-muted-foreground border-b border-border overflow-x-auto">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="size-3" />}
                <button
                  type="button"
                  onClick={() => setFolderId(crumb.id)}
                  className={`hover:text-foreground transition ${folderId === crumb.id ? "text-foreground font-medium" : ""}`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
            <span className="ml-auto shrink-0">{sorted.length} Dateien · {folders.length} Ordner</span>
          </div>

          {/* Content area */}
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 p-3 overflow-y-auto">
              {!creatorId ? (
                <EmptyState text="Wähle einen Creator um die Mediathek zu öffnen" />
              ) : isLoading ? (
                <div className="py-16 grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
              ) : folders.length === 0 && sorted.length === 0 ? (
                <EmptyState text="Leer — Ordner anlegen oder Bilder hochladen" />
              ) : (
                <>
                  {/* Folders row */}
                  {view === "grid" && !search && folders.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFolderId(f.id)}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-elevated hover:border-primary/40 transition text-center"
                        >
                          <FolderOpen className="size-8 text-primary" />
                          <span className="text-xs font-medium truncate w-full">{f.name}</span>
                          <span className="text-[10px] text-muted-foreground">{f._count?.assets ?? 0} Dateien</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {view === "grid" ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {sorted.map((item) => (
                        <FileCard
                          key={item.id}
                          item={item}
                          selected={selectedId === item.id}
                          catLabel={catLabel(item.category)}
                          onSelect={() => setSelectedId(item.id)}
                          onEdit={() => setEditId(item.id)}
                          onDelete={() => {
                            if (!confirm("Datei löschen?")) return;
                            remove.mutate(item.id, { onSuccess: () => { toast.success("Gelöscht"); setSelectedId(null); } });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-elevated text-muted-foreground text-left">
                            <th className="p-2.5 font-medium">Name</th>
                            <th className="p-2.5 font-medium hidden sm:table-cell">Kategorie</th>
                            <th className="p-2.5 font-medium hidden md:table-cell">Größe</th>
                            <th className="p-2.5 font-medium hidden md:table-cell">Datum</th>
                            <th className="p-2.5 w-16" />
                          </tr>
                        </thead>
                        <tbody>
                          {!search && folders.map((f) => (
                            <tr key={f.id} className="border-t border-border hover:bg-elevated/60 cursor-pointer" onClick={() => setFolderId(f.id)}>
                              <td className="p-2.5 flex items-center gap-2">
                                <Folder className="size-4 text-primary shrink-0" /> {f.name}
                              </td>
                              <td className="p-2.5 hidden sm:table-cell text-muted-foreground">Ordner</td>
                              <td className="p-2.5 hidden md:table-cell text-muted-foreground">{f._count?.assets ?? 0} Dateien</td>
                              <td className="p-2.5 hidden md:table-cell text-muted-foreground">{new Date(f.createdAt).toLocaleDateString("de-DE")}</td>
                              <td className="p-2.5">
                                <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm("Ordner löschen?")) removeFolder.mutate(f.id, { onSuccess: () => toast.success("Ordner gelöscht") }); }} className="text-destructive hover:underline">Löschen</button>
                              </td>
                            </tr>
                          ))}
                          {sorted.map((item) => (
                            <tr
                              key={item.id}
                              className={`border-t border-border hover:bg-elevated/60 cursor-pointer ${selectedId === item.id ? "bg-primary/5" : ""}`}
                              onClick={() => setSelectedId(item.id)}
                            >
                              <td className="p-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={item.url} alt="" className="size-8 rounded object-cover shrink-0" />
                                  <span className="truncate font-medium">{item.title}</span>
                                </div>
                              </td>
                              <td className="p-2.5 hidden sm:table-cell"><Badge tone="info">{catLabel(item.category)}</Badge></td>
                              <td className="p-2.5 hidden md:table-cell text-muted-foreground">{formatFileSize(item.fileSize)}</td>
                              <td className="p-2.5 hidden md:table-cell text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("de-DE")}</td>
                              <td className="p-2.5">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditId(item.id); }} className="text-primary"><MoreHorizontal className="size-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Details panel */}
            {selected && !compact && (
              <aside className="hidden xl:block w-56 shrink-0 border-l border-border p-3">
                <img src={selected.url} alt="" className="w-full aspect-square object-cover rounded-xl mb-3" />
                <div className="space-y-2 text-xs">
                  <div className="font-medium truncate">{selected.title}</div>
                  <DetailRow label="Datei" value={selected.filename} />
                  <DetailRow label="Kategorie" value={catLabel(selected.category)} />
                  <DetailRow label="Größe" value={formatFileSize(selected.fileSize)} />
                  <DetailRow label="Hochgeladen" value={new Date(selected.createdAt).toLocaleString("de-DE")} />
                </div>
                <div className="flex gap-2 mt-4">
                  <Btn variant="ghost" size="sm" onClick={() => setEditId(selected.id)}><Pencil className="size-3.5" /> Bearbeiten</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => { if (confirm("Löschen?")) remove.mutate(selected.id); }}><Trash2 className="size-3.5" /></Btn>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* New folder modal */}
      <Modal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="Neuer Ordner" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setNewFolderOpen(false)}>Abbrechen</Btn><Btn variant="brand" onClick={handleCreateFolder} disabled={createFolder.isPending}>Erstellen</Btn></>}>
        <Field label="Ordnername">
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="z.B. PPV März 2026" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} />
        </Field>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editItem} onClose={() => setEditId(null)} title="Datei bearbeiten" size="sm"
        footer={<Btn variant="ghost" onClick={() => setEditId(null)}>Fertig</Btn>}>
        {editItem && (
          <div className="space-y-3">
            <img src={editItem.url} alt="" className="w-full max-h-48 object-contain rounded-xl bg-black/40" />
            <Field label="Titel">
              <input
                className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                value={editItem.title}
                onChange={(e) => update.mutate({ id: editItem.id, title: e.target.value })}
              />
            </Field>
            <Field label="Kategorie">
              <Select
                value={editItem.category}
                onChange={(e) => update.mutate({ id: editItem.id, category: e.target.value }, { onSuccess: () => toast.success("Gespeichert") })}
              >
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            {folders.length > 0 && (
              <Field label="Ordner">
                <Select
                  value={editItem.folderId ?? ""}
                  onChange={(e) => update.mutate({ id: editItem.id, folderId: e.target.value || null }, { onSuccess: () => toast.success("Verschoben") })}
                >
                  <option value="">Stammverzeichnis</option>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}

function NavBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-elevated hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FileCard({
  item, selected, catLabel, onSelect, onEdit, onDelete,
}: {
  item: MediaItem; selected: boolean; catLabel: string;
  onSelect: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div
      className={`aspect-square rounded-xl relative overflow-hidden group border transition cursor-pointer ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-border bg-black/30 hover:border-primary/40"
      }`}
      onClick={onSelect}
    >
      <img src={item.url} alt={item.title} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2 gap-1">
        <div className="text-[10px] text-white font-medium truncate">{item.title}</div>
        <Badge tone="info">{catLabel}</Badge>
        <div className="flex gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="size-7 rounded-lg bg-white/15 grid place-items-center"><Pencil className="size-3 text-white" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="size-7 rounded-lg bg-destructive/40 grid place-items-center"><Trash2 className="size-3 text-white" /></button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="truncate">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">
      <ImageIcon className="size-8 mx-auto mb-2 opacity-40" />
      {text}
    </div>
  );
}