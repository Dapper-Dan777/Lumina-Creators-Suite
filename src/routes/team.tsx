import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Badge, Btn, Modal, Field, Input, Select } from "@/components/AppShell";
import { useStore, ALL_PERMISSIONS, timeAgo, type Role } from "@/lib/store";
import { UserPlus, Shield, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [
    { title: "Team · Lumina Manage" },
    { name: "description", content: "Team: Verwalte Mitglieder, Rollen und Berechtigungen deiner Agentur." },
    { property: "og:title", content: "Team · Lumina Manage" },
    { property: "og:description", content: "Team: Verwalte Mitglieder, Rollen und Berechtigungen deiner Agentur." },
    { property: "og:url", content: "/team" },
  ], links: [{ rel: "canonical", href: "/team" }] }),
  component: Team,
});

const ROLES: Role[] = ["Manager", "Chatter", "Editor", "VA"];

function Team() {
  const team = useStore((s) => s.team);
  const activity = useStore((s) => s.activity);
  const rolePerms = useStore((s) => s.rolePerms);
  const addMember = useStore((s) => s.addTeamMember);
  const updateRole = useStore((s) => s.updateTeamRole);
  const removeMember = useStore((s) => s.removeTeamMember);
  const togglePerm = useStore((s) => s.togglePerm);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [iName, setIName] = useState("");
  const [iEmail, setIEmail] = useState("");
  const [iRole, setIRole] = useState<Role>("Chatter");

  return (
    <AppShell
      title="Team & Rollen"
      subtitle="Verwalte Mitglieder und feingranulare Rechte"
      actions={
        <Btn variant="brand" onClick={() => setInviteOpen(true)}><UserPlus className="size-4" /> Mitglied einladen</Btn>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-5">
        {team.map((m) => (
          <Card key={m.id} className="p-4 lg:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="relative">
                <img src={m.avatar} className="size-14 rounded-2xl" alt="" />
                {m.online && <div className="absolute bottom-0 right-0 size-3.5 rounded-full bg-success border-2 border-card" />}
              </div>
              <button onClick={() => { if (confirm(`${m.name} entfernen?`)) { removeMember(m.id); toast("Entfernt"); }}}
                className="size-8 grid place-items-center rounded-lg hover:bg-elevated text-muted-foreground hover:text-destructive transition">
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="font-display font-semibold">{m.name}</div>
            <div className="text-xs text-muted-foreground mb-2">{m.email}</div>
            <Select value={m.role} onChange={(e) => { updateRole(m.id, e.target.value as Role); toast.success("Rolle aktualisiert"); }}
              className="h-8 text-xs">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              {m.creators.length} Creator zugewiesen
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Shield className="size-5 text-primary" /> Rechte-Matrix
          </h2>
          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left py-2 px-4 lg:px-0">Recht</th>
                  {ROLES.map((r) => <th key={r} className="text-center py-2 px-2">{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm} className="border-b border-border">
                    <td className="py-2 px-4 lg:px-0 text-sm">{perm}</td>
                    {ROLES.map((r) => {
                      const has = rolePerms[r].includes(perm);
                      return (
                        <td key={r} className="text-center py-2 px-2">
                          <button onClick={() => { togglePerm(r, perm); toast.success(`${r}: ${perm} ${has ? "entzogen" : "gewährt"}`); }}
                            className={`size-6 rounded-md grid place-items-center transition ${has ? "bg-success/20 text-success" : "bg-elevated border border-border text-muted-foreground hover:text-foreground"}`}>
                            {has && <Check className="size-4" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4">Aktivitätsverlauf</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto -mx-2 px-2">
            {activity.map((l) => (
              <div key={l.id} className="flex gap-3 text-sm pb-3 border-b border-border last:border-0">
                <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center text-xs font-bold shrink-0 text-white">
                  {l.actor.split(" ").map((p) => p[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="leading-tight">
                    <span className="font-medium">{l.actor}</span>{" "}
                    <span className="text-muted-foreground">{l.action}</span>{" "}
                    <span className="font-medium text-primary">{l.target}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{timeAgo(l.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Mitglied einladen"
        footer={<>
          <Btn variant="outline" onClick={() => setInviteOpen(false)}>Abbrechen</Btn>
          <Btn variant="brand" onClick={() => {
            if (!iName.trim() || !iEmail.trim()) return toast.error("Name & Email nötig");
            addMember({ name: iName, email: iEmail, role: iRole, creators: [] });
            toast.success(`Einladung an ${iEmail} gesendet`);
            setInviteOpen(false); setIName(""); setIEmail("");
          }}><Check className="size-4" /> Einladen</Btn>
        </>}>
        <div className="space-y-3">
          <Field label="Name"><Input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Sam Smith" autoFocus /></Field>
          <Field label="Email"><Input type="email" value={iEmail} onChange={(e) => setIEmail(e.target.value)} placeholder="sam@lumina.io" /></Field>
          <Field label="Rolle">
            <Select value={iRole} onChange={(e) => setIRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
