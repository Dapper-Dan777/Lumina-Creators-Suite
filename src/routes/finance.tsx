import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Stat, Badge, Btn, Select } from "@/components/AppShell";
import { useCreators } from "@/hooks/useCreators";
import { useStore, eur } from "@/lib/store";
import { Wallet, Download, Check, Pause, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/finance")({
  head: () => ({ meta: [
    { title: "Finanzen · Lumina Manage" },
    { name: "description", content: "Finanzen: Payouts, Rechnungen und Abrechnungen für deine Agentur." },
    { property: "og:title", content: "Finanzen · Lumina Manage" },
    { property: "og:description", content: "Finanzen: Payouts, Rechnungen und Abrechnungen für deine Agentur." },
    { property: "og:url", content: "/finance" },
  ], links: [{ rel: "canonical", href: "/finance" }] }),
  component: Finance,
});

function Finance() {
  const { data: creators = [] } = useCreators();
  const payouts = useStore((s) => s.payouts);
  const setStatus = useStore((s) => s.setPayoutStatus);
  const payAll = useStore((s) => s.payAll);
  const [filter, setFilter] = useState<"all" | "paid" | "scheduled" | "hold">("all");

  const list = useMemo(() => payouts.filter((p) => filter === "all" || p.status === filter), [payouts, filter]);

  const cName = (id: string) => creators.find((c) => c.id === id)?.name ?? "Unbekannt";
  const cShare = (id: string) => creators.find((c) => c.id === id)?.revenueShare ?? 70;

  const totalGross = creators.reduce((s, c) => s + c.monthlyRevenue, 0);
  const creatorTotal = creators.reduce((s, c) => s + c.monthlyRevenue * (c.revenueShare / 100), 0);
  const agencyTotal = totalGross - creatorTotal;
  const pct = (part: number) => (totalGross > 0 ? `${Math.round((part / totalGross) * 100)}% Anteil` : "Keine Daten");
  const scheduled = payouts.filter((p) => p.status === "scheduled").reduce((s, p) => {
    return s + p.gross * (cShare(p.creatorId) / 100);
  }, 0);

  const exportCSV = () => {
    const rows = [["Creator","Brutto","Creator Share","Agency Share","Methode","Status","Datum"]];
    list.forEach((p) => {
      const name = cName(p.creatorId);
      const share = cShare(p.creatorId);
      const cs = Math.round(p.gross * (share / 100));
      rows.push([name, String(p.gross), String(cs), String(p.gross - cs), p.method, p.status, p.date]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `payouts-${Date.now()}.csv`; a.click();
    toast.success("CSV exportiert");
  };

  return (
    <AppShell
      title="Finanzen & Payouts"
      subtitle="Auto-Berechnung Revenue-Share · editierbar"
      actions={
        <>
          <Btn variant="ghost" onClick={exportCSV}><Download className="size-4" /> Export</Btn>
          <Btn variant="brand" onClick={() => { payAll(); toast.success("Alle Payouts ausgelöst"); }}>
            <Check className="size-4" /> Batch Payout
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5">
        <Stat label="Bruttoumsatz" value={eur(totalGross)} delta="Mai 2026" accent="magenta" />
        <Stat label="Creator Payouts" value={eur(creatorTotal)} delta={pct(creatorTotal)} accent="cyan" />
        <Stat label="Agency Revenue" value={eur(agencyTotal)} delta={pct(agencyTotal)} accent="success" />
        <Stat label="Ausstehend" value={eur(scheduled)} delta="zur Auszahlung" accent="warning" />
      </div>

      <Card className="p-4 lg:p-6 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-semibold text-base lg:text-lg flex items-center gap-2">
            <Wallet className="size-5 text-primary" /> Payout-Übersicht
          </h2>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-auto">
            <option value="all">Alle</option>
            <option value="paid">Bezahlt</option>
            <option value="scheduled">Geplant</option>
            <option value="hold">Hold</option>
          </Select>
        </div>
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 lg:px-0">Creator</th>
                <th className="text-right py-3">Brutto</th>
                <th className="text-right py-3">Creator</th>
                <th className="text-right py-3">Agency</th>
                <th className="text-right py-3">Methode</th>
                <th className="text-right py-3 px-4 lg:px-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const share = cShare(p.creatorId);
                const cs = Math.round(p.gross * (share / 100));
                return (
                  <tr key={p.id} className="border-b border-border hover:bg-elevated/60">
                    <td className="py-3 px-4 lg:px-0 font-medium">{cName(p.creatorId)}</td>
                    <td className="py-3 text-right font-display font-semibold">{eur(p.gross)}</td>
                    <td className="py-3 text-right text-cyan">{eur(cs)}</td>
                    <td className="py-3 text-right text-primary">{eur(p.gross - cs)}</td>
                    <td className="py-3 text-right text-muted-foreground">{p.method}</td>
                    <td className="py-3 px-4 lg:px-0 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Badge tone={p.status === "paid" ? "success" : p.status === "scheduled" ? "warning" : "danger"}>{p.status}</Badge>
                        {p.status !== "paid" && (
                          <button onClick={() => { setStatus(p.id, "paid"); toast.success("Bezahlt"); }} className="size-7 grid place-items-center rounded hover:bg-elevated" title="Als bezahlt markieren">
                            <Check className="size-3.5 text-success" />
                          </button>
                        )}
                        {p.status === "scheduled" && (
                          <button onClick={() => { setStatus(p.id, "hold"); toast("Pausiert"); }} className="size-7 grid place-items-center rounded hover:bg-elevated" title="Pausieren">
                            <Pause className="size-3.5 text-warning" />
                          </button>
                        )}
                        {p.status === "hold" && (
                          <button onClick={() => { setStatus(p.id, "scheduled"); toast("Aktiv"); }} className="size-7 grid place-items-center rounded hover:bg-elevated" title="Reaktivieren">
                            <Play className="size-3.5 text-success" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4">Payout-Methoden</h2>
          <div className="space-y-3">
            {(["SEPA","PayPal","Crypto"] as const).map((m) => {
              const count = payouts.filter((p) => p.method === m).length;
              return (
                <div key={m} className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-sm font-medium">{m === "Crypto" ? "Krypto (USDT)" : m}</span>
                  <Badge tone="info">{count} Creator</Badge>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4">Steuer & Rechnungen</h2>
          <div className="space-y-2">
            {["Mai 2026 · #2026-05", "April 2026 · #2026-04", "März 2026 · #2026-03"].map((r) => (
              <button key={r} onClick={() => toast.success(`Download: ${r}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-elevated border border-border hover:border-primary/40 cursor-pointer text-left">
                <span className="text-sm">{r}</span>
                <Download className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
