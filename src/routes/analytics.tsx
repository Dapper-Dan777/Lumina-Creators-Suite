import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Stat, Badge, Btn, Select } from "@/components/AppShell";
import { useStore, eur } from "@/lib/store";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [
    { title: "Analytics · Lumina Manage" },
    { name: "description", content: "Analytics: Performance, Retention und Revenue-Übersichten für deine Creator." },
    { property: "og:title", content: "Analytics · Lumina Manage" },
    { property: "og:description", content: "Analytics: Performance, Retention und Revenue-Übersichten für deine Creator." },
    { property: "og:url", content: "/analytics" },
  ], links: [{ rel: "canonical", href: "/analytics" }] }),
  component: Analytics,
});

const trend = [
  { month: "Dez", revenue: 142000 },
  { month: "Jan", revenue: 156000 },
  { month: "Feb", revenue: 168000 },
  { month: "Mär", revenue: 175000 },
  { month: "Apr", revenue: 182000 },
  { month: "Mai", revenue: 188580 },
];

function Analytics() {
  const creators = useStore((s) => s.creators);
  const [range, setRange] = useState("30d");
  const [niche, setNiche] = useState("");

  const filtered = useMemo(() => creators.filter((c) => !niche || c.niche === niche), [creators, niche]);
  const compareData = filtered.map((c) => ({ name: c.name.split(" ")[0], revenue: c.monthlyRevenue, goal: c.monthlyGoal }));
  const nicheData = Object.entries(
    creators.reduce<Record<string, number>>((acc, c) => { acc[c.niche] = (acc[c.niche] || 0) + c.monthlyRevenue; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));
  const colors = ["#ec4899", "#22d3ee", "#a855f7", "#f59e0b", "#10b981", "#f43f5e"];

  const totalRev = filtered.reduce((s, c) => s + c.monthlyRevenue, 0);
  const avgRev = filtered.length ? totalRev / filtered.length : 0;

  const exportCSV = () => {
    const rows = [["Creator","Niche","Revenue","Goal","Subs","Share","Growth"]];
    filtered.forEach((c) => rows.push([c.name, c.niche, String(c.monthlyRevenue), String(c.monthlyGoal), String(c.subscribers), `${c.revenueShare}%`, `${c.growth}%`]));
    const csv = rows.map((r) => r.map((x) => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `lumina-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert");
  };

  const exportPDF = () => {
    const html = `<!doctype html><html><head><title>Lumina Report</title><style>body{font-family:sans-serif;padding:32px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body>
      <h1>Lumina Manage – Performance Report</h1>
      <p>Range: ${range} · Erstellt: ${new Date().toLocaleString("de-DE")}</p>
      <table><tr><th>Creator</th><th>Niche</th><th>Revenue</th><th>Goal</th><th>Subs</th><th>Growth</th></tr>
      ${filtered.map((c) => `<tr><td>${c.name}</td><td>${c.niche}</td><td>${eur(c.monthlyRevenue)}</td><td>${eur(c.monthlyGoal)}</td><td>${c.subscribers}</td><td>${c.growth}%</td></tr>`).join("")}
      </table></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
    toast.success("PDF-Druckdialog geöffnet");
  };

  const niches = Array.from(new Set(creators.map((c) => c.niche)));

  return (
    <AppShell
      title="Analytics & Reports"
      subtitle="Tiefe Einblicke in Performance, Retention und Revenue"
      actions={
        <>
          <Btn variant="ghost" onClick={exportPDF}><FileText className="size-4" /> PDF</Btn>
          <Btn variant="brand" onClick={exportCSV}><Download className="size-4" /> CSV</Btn>
        </>
      }
    >
      <Card className="p-3 lg:p-4 mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">Filter:</span>
        <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-auto">
          <option value="7d">7 Tage</option>
          <option value="30d">30 Tage</option>
          <option value="90d">90 Tage</option>
          <option value="ytd">YTD</option>
        </Select>
        <Select value={niche} onChange={(e) => setNiche(e.target.value)} className="w-auto">
          <option value="">Alle Nischen</option>
          {niches.map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5">
        <Stat label="Retention Rate" value="87.3%" delta="+2.1% MoM" accent="success" />
        <Stat label="Avg Revenue / Creator" value={eur(Math.round(avgRev))} delta="+8% MoM" accent="magenta" />
        <Stat label="Churn Rate" value="4.8%" delta="-0.6% MoM" accent="cyan" />
        <Stat label="LTV / Subscriber" value={eur(186)} delta="+€12 MoM" accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2 p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4">Creator-Vergleich · Revenue vs. Ziel</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={compareData}>
              <XAxis dataKey="name" stroke="oklch(0.6 0.02 270)" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="oklch(0.6 0.02 270)" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.014 280)", border: "1px solid oklch(0.28 0.018 280)", borderRadius: 12 }} formatter={(v: number) => eur(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="goal" fill="oklch(0.3 0.02 280)" radius={[6, 6, 0, 0]} name="Ziel" />
              <Bar dataKey="revenue" fill="oklch(0.68 0.28 340)" radius={[6, 6, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4">Revenue nach Niche</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={nicheData} dataKey="value" innerRadius={45} outerRadius={85} paddingAngle={3}>
                {nicheData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "oklch(0.2 0.014 280)", border: "1px solid oklch(0.28 0.018 280)", borderRadius: 12 }} formatter={(v: number) => eur(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {nicheData.map((n, i) => (
              <div key={n.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="size-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} /><span>{n.name}</span></div>
                <span className="font-medium">{eur(n.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4">Retention Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend.map((r, i) => ({ ...r, retention: 80 + i * 1.4 }))}>
              <XAxis dataKey="month" stroke="oklch(0.6 0.02 270)" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="oklch(0.6 0.02 270)" fontSize={11} axisLine={false} tickLine={false} domain={[70, 95]} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.014 280)", border: "1px solid oklch(0.28 0.018 280)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="retention" stroke="oklch(0.78 0.16 200)" strokeWidth={3} dot={{ fill: "oklch(0.78 0.16 200)" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:p-6">
          <h2 className="font-display font-semibold mb-4">Revenue-Share Breakdown</h2>
          <div className="space-y-3 max-h-[240px] overflow-y-auto -mx-2 px-2">
            {filtered.filter((c) => c.monthlyRevenue > 0).map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={c.avatar} className="size-6 rounded-md shrink-0" alt="" />
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <Badge>{c.revenueShare}/{100 - c.revenueShare}</Badge>
                  </div>
                  <span className="text-sm font-display font-bold shrink-0">{eur(c.monthlyRevenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
                  <div className="h-full bg-gradient-brand" style={{ width: `${c.revenueShare}%` }} />
                  <div className="h-full bg-cyan" style={{ width: `${100 - c.revenueShare}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
