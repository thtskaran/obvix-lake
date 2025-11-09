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
  KnowledgeArticle,
  KnowledgeArticlesResponse,
  KnowledgeDocumentChunksResponse,
  MetricsSnapshot,
  PersonasResponse,
  KnowledgeCatalogResponse,
  RejectKnowledgeQueueRequest,
  RejectKnowledgeQueueResponse,
  TicketRouteRequest,
  TicketRouteResponse,
  CreateKnowledgeArticleRequest,
  UpdateKnowledgeArticleRequest,
  TicketListResponse,
  TicketMetadataResponse,
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

export async function rejectKnowledgeQueueItem(
  itemId: string,
  payload?: RejectKnowledgeQueueRequest,
  signal?: AbortSignal,
): Promise<RejectKnowledgeQueueResponse> {
  const trimmedId = itemId?.trim();
  const endpoint = `/knowledge/queue/${encodeURIComponent(trimmedId)}/reject`;
  const body = payload && Object.keys(payload).length > 0 ? payload : undefined;
  const { data } = await apiClient.post<RejectKnowledgeQueueResponse>(endpoint, body, { signal });
  return {
    status: data?.status ?? "rejected",
    queue_id: data?.queue_id,
    rejection_reason: data?.rejection_reason,
  };
}

export interface KnowledgeArticlesParams {
  persona?: string;
  limit?: number;
  offset?: number;
  includeFullText?: boolean;
  includeChunks?: boolean;
  tags?: string[];
  search?: string;
  sourceTicketId?: string;
  autoGenerated?: boolean;
}

function buildKnowledgeArticlesQuery(params: KnowledgeArticlesParams): string {
  const searchParams = new URLSearchParams();
  if (params.persona) {
    searchParams.set("persona", params.persona);
  }
  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.max(1, Math.min(params.limit, 200))));
  }
  if (typeof params.offset === "number" && Number.isFinite(params.offset)) {
    searchParams.set("offset", String(Math.max(0, params.offset)));
  }
  if (params.tags?.length) {
    params.tags.forEach((tag) => {
      if (tag?.trim()) {
        searchParams.append("tag", tag.trim());
      }
    });
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.sourceTicketId?.trim()) {
    searchParams.set("source_ticket_id", params.sourceTicketId.trim());
  }
  if (typeof params.autoGenerated === "boolean") {
    searchParams.set("auto_generated", params.autoGenerated ? "true" : "false");
  }
  const includeTokens: string[] = [];
  if (params.includeFullText) {
    includeTokens.push("full");
  }
  if (params.includeChunks) {
    includeTokens.push("chunks");
  }
  if (includeTokens.length) {
    searchParams.set("include", includeTokens.join(","));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchKnowledgeArticles(
  params: KnowledgeArticlesParams = {},
  signal?: AbortSignal,
): Promise<KnowledgeArticlesResponse> {
  const endpoint = `/knowledge/articles${buildKnowledgeArticlesQuery(params)}`;
  const { data } = await apiClient.get<KnowledgeArticlesResponse>(endpoint, { signal });
  return {
    articles: Array.isArray(data?.articles) ? data.articles : [],
    count: typeof data?.count === "number" ? data.count : 0,
    total: typeof data?.total === "number" ? data.total : 0,
    persona: data?.persona,
    limit: data?.limit,
    offset: data?.offset,
  };
}

export interface KnowledgeCatalogParams {
  personas?: string[];
  glpiLimit?: number;
  gdriveLimit?: number;
}

function buildKnowledgeCatalogQuery(params: KnowledgeCatalogParams = {}): string {
  const searchParams = new URLSearchParams();
  params.personas
    ?.filter((persona) => persona && persona.trim())
    .forEach((persona) => {
      searchParams.append("persona", persona.trim());
    });
  if (typeof params.glpiLimit === "number" && Number.isFinite(params.glpiLimit)) {
    searchParams.set("glpi_limit", String(Math.max(1, Math.min(params.glpiLimit, 1000))));
  }
  if (typeof params.gdriveLimit === "number" && Number.isFinite(params.gdriveLimit)) {
    searchParams.set("gdrive_limit", String(Math.max(1, Math.min(params.gdriveLimit, 1000))));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchKnowledgeCatalog(
  params: KnowledgeCatalogParams = {},
  signal?: AbortSignal,
): Promise<KnowledgeCatalogResponse> {
  const endpoint = `/knowledge/catalog${buildKnowledgeCatalogQuery(params)}`;
  const { data } = await apiClient.get<KnowledgeCatalogResponse>(endpoint, { signal });
  const personas = Array.isArray(data?.personas) ? data.personas : [];
  return {
    personas: personas.map((entry) => {
      const personaSlug = typeof entry?.persona === "string" && entry.persona ? entry.persona : "";
      const glpiArticles = Array.isArray(entry?.glpi_articles) ? entry.glpi_articles : [];
      const gdriveDocuments = Array.isArray(entry?.gdrive_documents) ? entry.gdrive_documents : [];
      return {
        persona: personaSlug,
        counts: {
          glpi_articles: Number(entry?.counts?.glpi_articles ?? 0),
          gdrive_documents: Number(entry?.counts?.gdrive_documents ?? 0),
          gdrive_chunks: Number(entry?.counts?.gdrive_chunks ?? 0),
        },
        glpi_articles: glpiArticles.map((article) => ({
          ...article,
          tags: Array.isArray(article?.tags)
            ? article.tags.filter((tag): tag is string => typeof tag === "string")
            : [],
        })),
        gdrive_documents: gdriveDocuments
          .map((doc) => {
            const fileId = doc?.file_id ?? "";
            if (!fileId) {
              return null;
            }
            const rawTags = Array.isArray(doc?.tags)
              ? doc.tags.filter((tag): tag is string => typeof tag === "string")
              : [];
            return {
              file_id: fileId,
              persona: doc?.persona ?? personaSlug,
              filename: doc?.filename ?? fileId,
              source: doc?.source,
              chunk_count: Number(doc?.chunk_count ?? 0),
              content_preview: doc?.content_preview,
              tags: rawTags,
              updated_at: doc?.updated_at,
              created_at: doc?.created_at,
            };
          })
          .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc)),
      };
    }),
    totals: {
      glpi_articles: Number(data?.totals?.glpi_articles ?? 0),
      gdrive_documents: Number(data?.totals?.gdrive_documents ?? 0),
      gdrive_chunks: Number(data?.totals?.gdrive_chunks ?? 0),
    },
  };
}

export async function createKnowledgeArticle(
  payload: CreateKnowledgeArticleRequest,
  signal?: AbortSignal,
): Promise<KnowledgeArticle> {
  const { data } = await apiClient.post<KnowledgeArticle>("/knowledge/articles", payload, { signal });
  const article = data ?? { id: crypto?.randomUUID?.() ?? String(Date.now()), tags: [] };
  return {
    ...article,
    tags: Array.isArray(article.tags)
      ? article.tags.filter((tag): tag is string => typeof tag === "string")
      : Array.isArray(payload.tags)
        ? payload.tags.map((tag) => tag.toString())
        : typeof payload.tags === "string"
          ? payload.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
  };
}

export async function updateKnowledgeArticle(
  articleId: string,
  payload: UpdateKnowledgeArticleRequest,
  signal?: AbortSignal,
): Promise<KnowledgeArticle> {
  const endpoint = `/knowledge/articles/${encodeURIComponent(articleId)}`;
  const { data } = await apiClient.put<KnowledgeArticle>(endpoint, payload, { signal });
  const article = data ?? { id: articleId, tags: [] };
  return {
    ...article,
    id: article.id ?? articleId,
    tags: Array.isArray(article.tags)
      ? article.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}

export interface KnowledgeDocumentChunksParams {
  persona: string;
  limit?: number;
  offset?: number;
  includeEmbedding?: boolean;
}

function buildKnowledgeChunksQuery(params: KnowledgeDocumentChunksParams): string {
  const searchParams = new URLSearchParams();
  if (params.persona) {
    searchParams.set("persona", params.persona);
  }
  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.max(1, Math.min(params.limit, 500))));
  }
  if (typeof params.offset === "number" && Number.isFinite(params.offset)) {
    searchParams.set("offset", String(Math.max(0, params.offset)));
  }
  if (params.includeEmbedding) {
    searchParams.set("include", "embedding");
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchKnowledgeDocumentChunks(
  fileId: string,
  params: KnowledgeDocumentChunksParams,
  signal?: AbortSignal,
): Promise<KnowledgeDocumentChunksResponse> {
  const endpoint = `/knowledge/documents/${encodeURIComponent(fileId)}/chunks${buildKnowledgeChunksQuery(params)}`;
  const { data } = await apiClient.get<KnowledgeDocumentChunksResponse>(endpoint, { signal });
  return {
    persona: data?.persona ?? params.persona,
    file_id: data?.file_id ?? fileId,
    chunks: Array.isArray(data?.chunks) ? data.chunks : [],
    count: typeof data?.count === "number" ? data.count : 0,
    total: typeof data?.total === "number" ? data.total : 0,
    limit: typeof data?.limit === "number" ? data.limit : params.limit ?? 0,
    offset: typeof data?.offset === "number" ? data.offset : params.offset ?? 0,
    has_more: Boolean(data?.has_more),
  };
}

export interface TicketListParams {
  persona?: string;
  status?: "open" | "closed";
  userId?: string;
  search?: string;
  limit?: number;
}

function buildTicketQuery(params: TicketListParams): string {
  const searchParams = new URLSearchParams();
  if (params.persona?.trim()) {
    searchParams.set("persona", params.persona.trim());
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.userId?.trim()) {
    searchParams.set("user_id", params.userId.trim());
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.max(1, Math.min(params.limit, 200))));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchTickets(
  params: TicketListParams = {},
  signal?: AbortSignal,
): Promise<TicketListResponse> {
  const endpoint = `/tickets${buildTicketQuery(params)}`;
  const { data } = await apiClient.get<TicketListResponse>(endpoint, { signal });
  return {
    tickets: Array.isArray(data?.tickets) ? data.tickets : [],
    count: typeof data?.count === "number" ? data.count : 0,
    total: typeof data?.total === "number" ? data.total : 0,
  };
}

export async function fetchTicketMetadata(
  recent: number = 10,
  signal?: AbortSignal,
): Promise<TicketMetadataResponse> {
  const endpoint = `/tickets/metadata?recent=${encodeURIComponent(String(Math.max(1, Math.min(recent, 50))))}`;
  const { data } = await apiClient.get<TicketMetadataResponse>(endpoint, { signal });
  return {
    summary: data?.summary ?? { total: 0, open: 0, closed: 0, open_ratio: 0 },
    by_persona: Array.isArray(data?.by_persona) ? data.by_persona : [],
    by_status: Array.isArray(data?.by_status) ? data.by_status : [],
    top_escalation_reasons: Array.isArray(data?.top_escalation_reasons) ? data.top_escalation_reasons : [],
    recent: Array.isArray(data?.recent) ? data.recent : [],
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
