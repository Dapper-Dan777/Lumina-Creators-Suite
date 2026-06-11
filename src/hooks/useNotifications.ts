import { useMemo, useState, useCallback } from "react";
import { useContent } from "@/hooks/useContent";
import { useCreators } from "@/hooks/useCreators";
import { useOnlyFansStats } from "@/hooks/useOnlyFansStats";
import { eur, type AlertItem } from "@/lib/store";

const STORAGE_KEY = "lumina-dismissed-alerts";

function loadDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useNotifications() {
  const { data: pendingContent = [] } = useContent({ status: "pending" });
  const { data: creators = [] } = useCreators();
  const { data: ofStats } = useOnlyFansStats();
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);

  const alerts = useMemo(() => {
    const list: AlertItem[] = [];

    if (pendingContent.length > 0) {
      list.push({
        id: "pending-approval",
        type: "approval",
        severity: "medium",
        title: `${pendingContent.length} Content-Item(s) warten auf Approval`,
        description: pendingContent.map((c) => c.title).slice(0, 3).join(", "),
      });
    }

    if (ofStats && !ofStats.connected) {
      list.push({
        id: "of-connection",
        type: "risk",
        severity: "high",
        title: ofStats.pendingLink ? "OnlyFans-Account wird verbunden…" : "OnlyFansAPI nicht verbunden",
        description: ofStats.message ?? "Verbinde deinen Account unter app.onlyfansapi.com",
      });
    }

    for (const c of creators) {
      const days = (new Date(c.contractEndsAt).getTime() - Date.now()) / 86400000;
      if (days > 0 && days <= 30) {
        list.push({
          id: `contract-${c.id}`,
          type: "contract",
          severity: "high",
          title: `Vertrag ${c.name} läuft bald ab`,
          description: `Endet am ${c.contractEndsAt}`,
          creatorId: c.id,
        });
      }
    }

    for (const c of creators) {
      if (c.monthlyGoal > 0 && c.monthlyRevenue < c.monthlyGoal * 0.8) {
        const pct = Math.round((c.monthlyRevenue / c.monthlyGoal) * 100);
        list.push({
          id: `goal-${c.id}`,
          type: "goal",
          severity: "medium",
          title: `${c.name} unter Monatsziel`,
          description: `${pct}% von ${eur(c.monthlyGoal)}`,
          creatorId: c.id,
        });
      }
    }

    return list.filter((a) => !dismissed.includes(a.id));
  }, [pendingContent, creators, ofStats, dismissed]);

  const dismissAlert = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = [...prev, id];
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { alerts, dismissAlert };
}