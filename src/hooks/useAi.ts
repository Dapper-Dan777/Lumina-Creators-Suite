import { useMutation, useQuery } from "@tanstack/react-query";

export type AiStatus = {
  configured: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  local?: boolean;
};

export type ChatMessage = {
  from: "fan" | "creator" | "ai";
  text: string;
  time?: string;
};

export type ReplyRequest = {
  creatorName: string;
  creatorHandle?: string;
  niche?: string;
  creatorNotes?: string;
  fanName: string;
  fanHandle?: string;
  spend?: number;
  channel?: string;
  messages: ChatMessage[];
};

export type CaptionRequest = {
  creatorName: string;
  niche?: string;
  tone?: string;
  description: string;
  contentType?: string;
  ppvPrice?: number;
};

export type MassMessageRequest = {
  creatorName: string;
  niche?: string;
  campaignName?: string;
  audience?: string;
  ppvPrice?: number;
  hint?: string;
};

export type ImproveCaptionRequest = {
  creatorName: string;
  niche?: string;
  contentType?: string;
  title?: string;
  draftCaption?: string;
  ppvPrice?: number;
};

export type OnboardingRequest = {
  creatorName: string;
  handle?: string;
  niche?: string;
  monthlyGoal?: number;
  tone?: string;
};

export type PpvCopyRequest = {
  creatorName: string;
  niche?: string;
  bundleName?: string;
  itemCount?: number;
  price?: number;
  audience?: string;
  hint?: string;
};

export type RenewalRequest = {
  creatorName: string;
  niche?: string;
  contractEndsAt?: string;
  daysLeft?: number;
  monthlyRevenue?: number;
  relationship?: string;
};

async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch("/api/ai/status");
  if (!res.ok) throw new Error(`KI-Status: ${res.status}`);
  return res.json();
}

async function postAi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error ?? "KI-Anfrage fehlgeschlagen");
  return data as T;
}

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAiStatus,
    staleTime: 60_000,
  });
}

export function useAiReply() {
  return useMutation({
    mutationFn: (body: ReplyRequest) =>
      postAi<{ suggestions: string[] }>("/api/ai/reply", body).then((d) => d.suggestions),
  });
}

export function useAiCaption() {
  return useMutation({
    mutationFn: (body: CaptionRequest) =>
      postAi<{ captions: string[] }>("/api/ai/caption", body).then((d) => d.captions),
  });
}

export function useAiMassMessage() {
  return useMutation({
    mutationFn: (body: MassMessageRequest) =>
      postAi<{ message: string }>("/api/ai/mass-message", body).then((d) => d.message),
  });
}

export function useAiImproveCaption() {
  return useMutation({
    mutationFn: (body: ImproveCaptionRequest) =>
      postAi<{ caption: string }>("/api/ai/improve-caption", body).then((d) => d.caption),
  });
}

export function useAiOnboarding() {
  return useMutation({
    mutationFn: (body: OnboardingRequest) =>
      postAi<{ bio: string; welcomeDm: string; personaNotes: string }>("/api/ai/onboarding", body),
  });
}

export function useAiPpvCopy() {
  return useMutation({
    mutationFn: (body: PpvCopyRequest) =>
      postAi<{ variants: string[] }>("/api/ai/ppv-copy", body).then((d) => d.variants),
  });
}

export function useAiRenewal() {
  return useMutation({
    mutationFn: (body: RenewalRequest) =>
      postAi<{ fanMessage: string; managerBrief: string }>("/api/ai/renewal", body),
  });
}