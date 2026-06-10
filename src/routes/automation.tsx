import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/automation")({
  head: () => ({ meta: [
    { title: "Automationen · Lumina Manage" },
    { name: "description", content: "Automationen: eingebettete n8n-Oberfläche und Workflow-Controls." },
    { property: "og:title", content: "Automationen · Lumina Manage" },
    { property: "og:url", content: "/automation" },
  ], links: [{ rel: "canonical", href: "/automation" }] }),
  component: Automation,
});

function Automation() {
  return (
    <AppShell title="Automationen" subtitle="n8n Workflows">
      <div className="h-[80vh]">
        <iframe src={import.meta.env.DEV ? 'http://localhost:4000/n8n/' : '/n8n/'} className="w-full h-full border rounded-lg" title="n8n" />
      </div>
    </AppShell>
  );
}
