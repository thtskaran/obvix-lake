import { apiClient } from "./client";
import type {
  AnalyticsTrendsResponse,
  FeedbackRequest,
  FeedbackResponse,
  MetricsSnapshot,
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
