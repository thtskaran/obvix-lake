import { apiClient } from "./client";
import type {
  AnalyticsTrendsResponse,
  ChatRequest,
  ChatResponse,
  FeedbackRequest,
  FeedbackResponse,
  HealthResponse,
  KnowledgeApproveResponse,
  KnowledgeQueueItem,
  KnowledgeQueueResponse,
  MetricsSnapshot,
  PersonasResponse,
  TicketRouteRequest,
  TicketRouteResponse,
  TrendCluster,
} from "../../types/api";

function normalizeClusters(clusters: TrendCluster[] | undefined | null): TrendCluster[] {
  if (!clusters?.length) {
    return [];
  }
  return clusters.map((cluster) => ({
    ...cluster,
    top_entities: Array.isArray(cluster.top_entities) ? cluster.top_entities : [],
    ticket_ids: Array.isArray(cluster.ticket_ids) ? cluster.ticket_ids : [],
  }));
}

export async function fetchMetrics(signal?: AbortSignal): Promise<MetricsSnapshot> {
  const response = await apiClient.get<MetricsSnapshot>("/metrics", { signal });
  return {
    ...response.data,
  };
}

export async function fetchAnalyticsTrends(signal?: AbortSignal): Promise<AnalyticsTrendsResponse> {
  const response = await apiClient.get<AnalyticsTrendsResponse>("/analytics/trends", { signal });
  return {
    clusters: normalizeClusters(response.data?.clusters),
  };
}

export async function fetchPersonas(signal?: AbortSignal): Promise<string[]> {
  const { data } = await apiClient.get<PersonasResponse>("/personas", { signal });
  const personas = Array.isArray(data?.personas) ? data.personas : [];
  return personas
    .map((slug) => (typeof slug === "string" ? slug.trim() : ""))
    .filter((slug) => !!slug);
}

function sanitizeTicketPayload(payload: TicketRouteRequest): TicketRouteRequest {
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : undefined;
  return {
    description: payload.description.trim(),
    persona: payload.persona?.trim(),
    ticket_id: payload.ticket_id?.trim(),
    metadata,
  };
}

export async function routeTicket(
  payload: TicketRouteRequest,
  signal?: AbortSignal,
): Promise<TicketRouteResponse> {
  const { data } = await apiClient.post<TicketRouteResponse>("/tickets/route", sanitizeTicketPayload(payload), { signal });
  const matches = Array.isArray(data.matches) ? data.matches : [];
  return {
    ...data,
    matches: matches.map((match) => ({
      ...match,
      similarity: typeof match.similarity === "number" ? match.similarity : Number(match.similarity ?? 0),
    })),
    top_similarity: typeof data.top_similarity === "number" ? data.top_similarity : Number(data.top_similarity ?? 0),
  };
}

export async function submitFeedback(
  feedback: FeedbackRequest,
  signal?: AbortSignal,
): Promise<FeedbackResponse> {
  const payload: FeedbackRequest = {
    rating: feedback.rating,
    comment: feedback.comment?.trim() || undefined,
    ticket_id: feedback.ticket_id?.trim() || undefined,
    persona: feedback.persona?.trim() || undefined,
    source: feedback.source,
  };
  const { data } = await apiClient.post<FeedbackResponse>("/feedback", payload, { signal });
  return data;
}

export interface KnowledgeQueueParams {
  status?: string;
  limit?: number;
}

function normalizeQueueItem(item: Partial<KnowledgeQueueItem>): KnowledgeQueueItem {
  const candidateId = item.id ?? item.resolution_id ?? item.ticket_id ?? crypto?.randomUUID?.() ?? `queue_${Date.now()}`;
  const normalizedDraft = item.draft && typeof item.draft === "object" ? item.draft : null;
  const normalizedResolution = item.resolution && typeof item.resolution === "object" ? item.resolution : null;
  return {
    id: String(candidateId),
    persona: typeof item.persona === "string" ? item.persona : undefined,
    status: typeof item.status === "string" ? item.status : undefined,
    created_at: typeof item.created_at === "string" ? item.created_at : undefined,
    updated_at: typeof item.updated_at === "string" ? item.updated_at : undefined,
    lead_reviewed_at: typeof item.lead_reviewed_at === "string" ? item.lead_reviewed_at : undefined,
    sme_reviewed_at: typeof item.sme_reviewed_at === "string" ? item.sme_reviewed_at : undefined,
    approval_mode: typeof item.approval_mode === "string" ? item.approval_mode : undefined,
    approved_by: typeof item.approved_by === "string" ? item.approved_by : undefined,
    resolution_id: typeof item.resolution_id === "string" ? item.resolution_id : undefined,
    ticket_id: typeof item.ticket_id === "string" ? item.ticket_id : undefined,
    draft: normalizedDraft,
    resolution: normalizedResolution,
  };
}

export async function fetchKnowledgeQueue(
  params: KnowledgeQueueParams = {},
  signal?: AbortSignal,
): Promise<KnowledgeQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.max(1, Math.min(params.limit, 200))));
  }
  const endpoint = searchParams.size ? `/knowledge/queue?${searchParams.toString()}` : "/knowledge/queue";
  const { data } = await apiClient.get<KnowledgeQueueResponse>(endpoint, { signal });
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    auto_approve: Boolean(data?.auto_approve),
    items: items.map((item) => normalizeQueueItem(item ?? {})),
  };
}

export async function approveKnowledgeQueueItem(
  itemId: string,
  reviewer?: string,
  signal?: AbortSignal,
): Promise<KnowledgeApproveResponse> {
  const trimmedId = itemId?.trim();
  const endpoint = `/knowledge/queue/${encodeURIComponent(trimmedId)}/approve`;
  const payload = reviewer?.trim() ? { reviewer: reviewer.trim() } : undefined;
  const { data } = await apiClient.post<KnowledgeApproveResponse>(endpoint, payload, { signal });
  return {
    status: data?.status ?? "unknown",
    article_id: data?.article_id,
  };
}

export async function fetchHealthStatus(signal?: AbortSignal): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health", { signal });
  return data ?? {};
}

export async function sendChatMessage(
  payload: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const requestBody: ChatRequest = {
    persona_name: payload.persona_name.trim(),
    user_id: payload.user_id.trim(),
    message: payload.message ?? "",
  };
  const { data } = await apiClient.post<ChatResponse>("/chat", requestBody, { signal });
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  return {
    ...data,
    sources,
  };
}
