import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ScoutLead = {
  id: string;
  searchId: string | null;
  displayName: string;
  handle: string | null;
  platform: string;
  profileUrl: string;
  onlyfansUrl: string | null;
  hasOnlyfans: boolean;
  followers: number | null;
  engagement: number | null;
  niche: string | null;
  region: string | null;
  score: number;
  scoreReason: string;
  bio: string;
  signals: string[];
  status: string;
  notes: string;
  aiSummary: string;
  outreachDraft: string;
  creatorId: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScoutRunRequest = {
  brief?: string;
  niche?: string;
  region?: string;
  minFollowers?: number;
  maxFollowers?: number;
  ofFilter?: "any" | "none" | "has";
  platforms?: string[];
  limit?: number;
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error ?? `Fehler ${res.status}`);
  return data as T;
}

export type ScoutSearchStatus = {
  configured: boolean;
  connected: boolean;
  provider: string;
  error: string | null;
};

export function useScoutStatus() {
  return useQuery({
    queryKey: ["scout-status"],
    queryFn: () => getJson<{ search: ScoutSearchStatus }>("/api/scout/status").then((d) => d.search),
    staleTime: 60_000,
  });
}

export function useScoutLeads(filters?: {
  status?: string;
  platform?: string;
  minScore?: number;
  hasOnlyfans?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.platform) params.set("platform", filters.platform);
  if (filters?.minScore != null) params.set("minScore", String(filters.minScore));
  if (filters?.hasOnlyfans != null) params.set("hasOnlyfans", String(filters.hasOnlyfans));
  const qs = params.toString();

  return useQuery({
    queryKey: ["scout-leads", filters],
    queryFn: () => getJson<{ leads: ScoutLead[] }>(`/api/scout/leads${qs ? `?${qs}` : ""}`),
    select: (d) => d.leads,
    staleTime: 5_000,
  });
}

/** Invalidates and refetches all scout queries. Returns lead count from active leads query. */
export function useScoutRefresh(leadsRefetch: () => Promise<{ data?: ScoutLead[] }>) {
  const qc = useQueryClient();
  return async () => {
    const [leadsResult] = await Promise.all([
      leadsRefetch(),
      qc.invalidateQueries({ queryKey: ["scout-status"] }),
      qc.invalidateQueries({ queryKey: ["scout-searches"] }),
    ]);
    return leadsResult.data?.length ?? 0;
  };
}

export function useScoutSearches() {
  return useQuery({
    queryKey: ["scout-searches"],
    queryFn: () => getJson<{ searches: unknown[] }>("/api/scout/searches").then((d) => d.searches),
    staleTime: 30_000,
  });
}

export function useScoutRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ScoutRunRequest) =>
      getJson<{ searchId: string; queries: string[]; leads: ScoutLead[]; message: string }>(
        "/api/scout/run",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scout-leads"] });
      qc.invalidateQueries({ queryKey: ["scout-searches"] });
    },
  });
}

export function useScoutCheck() {
  return useMutation({
    mutationFn: (url: string) =>
      getJson<{ profile: ScoutLead & { checkedAt?: string } }>("/api/scout/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }),
  });
}

export function useScoutEnrich() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ lead: ScoutLead }>(`/api/scout/leads/${id}/enrich`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-leads"] }),
  });
}

export function useScoutOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tone }: { id: string; tone?: string }) =>
      getJson<{ lead: ScoutLead }>(`/api/scout/leads/${id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-leads"] }),
  });
}

export function useScoutConvert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ creator: unknown; leadId: string }>(`/api/scout/leads/${id}/convert`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scout-leads"] });
      qc.invalidateQueries({ queryKey: ["creators"] });
    },
  });
}

export function useScoutUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<ScoutLead, "status" | "notes" | "outreachDraft">> }) =>
      getJson<{ lead: ScoutLead }>(`/api/scout/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-leads"] }),
  });
}

export function useScoutDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ ok: boolean }>(`/api/scout/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-leads"] }),
  });
}