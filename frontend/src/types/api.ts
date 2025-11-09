export interface MetricsSnapshot {
  _id?: string;
  timestamp?: string;
  assistive_rate?: number;
  assistive?: number;
  human_agent?: number;
  avg_csat?: number;
  knowledge_growth_ratio?: number;
  avg_resolution_hours?: number;
}

export type TrendDirection = "emerging" | "growing" | "stable" | "declining";

export interface TrendCluster {
  cluster_id: number;
  label: string;
  size: number;
  trend: TrendDirection;
  top_entities: string[];
  ticket_ids: string[];
  last_updated?: string;
  _id?: string;
}

export interface AnalyticsTrendsResponse {
  clusters: TrendCluster[];
}

export type TicketUrgency = "low" | "medium" | "high" | "urgent";

export interface TicketClassification {
  issue_category: string;
  issue_type: string;
  urgency: TicketUrgency;
  impact_scope: "single_user" | "multi_user" | "systemwide";
  sentiment: "angry" | "neutral" | "positive";
  requires_human: boolean;
  needs_supervisor: boolean;
  confidence: number;
}

export interface TicketKnowledgeMatch {
  content?: string;
  similarity: number;
  match_reason?: string;
  article_id?: string;
  source_ticket_id?: string;
  title?: string;
}

export interface TicketRouteRequest {
  persona?: string;
  description: string;
  ticket_id?: string;
  metadata?: Record<string, unknown>;
}

export interface TicketRouteResponse {
  ticket_id?: string;
  persona: string;
  decision: "assistive" | "human_agent";
  classification: TicketClassification;
  matches: TicketKnowledgeMatch[];
  assistive: boolean;
  top_similarity: number;
  route_to_human: boolean;
}

export interface FeedbackRequest {
  rating: number;
  comment?: string;
  ticket_id?: string;
  persona?: string;
  source?: "customer" | "agent";
}

export interface FeedbackResponse {
  feedback_id: string;
}

export interface PersonasResponse {
  personas: string[];
}

export interface ServiceHealth {
  status: string;
  error?: string;
  reason?: string;
  time?: string;
  latency_ms?: number;
  [key: string]: unknown;
}

export type HealthResponse = Record<string, ServiceHealth>;

export interface KnowledgeDraft {
  title?: string;
  summary?: string;
  audience?: string;
  tags?: string[] | string;
  steps?: string[] | string;
  faq?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface KnowledgeResolution {
  ticket_id?: string;
  problem_summary?: string;
  root_cause?: string;
  solution_steps?: string[];
  transcript?: string;
  [key: string]: unknown;
}

export interface KnowledgeQueueItem {
  id: string;
  resolution_id?: string;
  ticket_id?: string;
  persona?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  lead_reviewed_at?: string;
  sme_reviewed_at?: string;
  approval_mode?: string;
  approved_by?: string;
  draft?: KnowledgeDraft | null;
  resolution?: KnowledgeResolution | null;
}

export interface KnowledgeQueueResponse {
  items: KnowledgeQueueItem[];
  auto_approve: boolean;
}

export interface KnowledgeApproveResponse {
  status: string;
  article_id?: string | null;
}

export interface KnowledgeArticleChunk {
  chunk_index?: number;
  content?: string;
  content_preview?: string;
  embedding?: number[] | null;
}

export interface KnowledgeArticleFaqEntry {
  question?: string | null;
  answer?: string | null;
}

export interface KnowledgeArticleOutlineEntry {
  title?: string;
  details?: string;
}

export interface KnowledgeArticleValidatedFact {
  fact: string;
  source: string;
  confidence?: string;
}

export interface KnowledgeArticle {
  id: string;
  persona?: string;
  title?: string;
  summary?: string;
  tags: string[];
  audience?: string;
  source_ticket_id?: string;
  auto_generated?: boolean;
  approved?: string | boolean;
  published_at?: string;
  approved_at?: string;
  updated_at?: string;
  chunk_count?: number;
  preventive_actions?: string[];
  faq?: KnowledgeArticleFaqEntry[];
  resolution_outline?: KnowledgeArticleOutlineEntry[];
  validated_facts?: KnowledgeArticleValidatedFact[];
  full_text?: string;
  full_text_preview?: string;
  chunks?: KnowledgeArticleChunk[];
}

export interface KnowledgeArticlesResponse {
  articles: KnowledgeArticle[];
  count: number;
  total: number;
  persona?: string;
  limit?: number;
  offset?: number;
}

export interface KnowledgeCatalogGlpiArticle {
  id?: string;
  persona?: string;
  title?: string;
  summary?: string;
  tags?: string[];
  audience?: string;
  auto_generated?: boolean;
  approved?: string | boolean;
  source_ticket_id?: string;
  source?: string;
  chunk_count?: number;
  published_at?: string;
  updated_at?: string;
  created_at?: string;
}

export interface KnowledgeCatalogGDriveDocument {
  file_id: string;
  persona?: string;
  filename?: string;
  source?: string;
  chunk_count?: number;
  content_preview?: string;
  tags?: string[];
  updated_at?: string;
  created_at?: string;
}

export interface KnowledgeCatalogCounts {
  glpi_articles: number;
  gdrive_documents: number;
  gdrive_chunks: number;
}

export interface KnowledgeCatalogPersonaEntry {
  persona: string;
  counts: KnowledgeCatalogCounts;
  glpi_articles: KnowledgeCatalogGlpiArticle[];
  gdrive_documents: KnowledgeCatalogGDriveDocument[];
}

export interface KnowledgeCatalogTotals extends KnowledgeCatalogCounts {}

export interface KnowledgeCatalogResponse {
  personas: KnowledgeCatalogPersonaEntry[];
  totals: KnowledgeCatalogTotals;
}

export interface CreateKnowledgeArticleRequest {
  persona: string;
  title?: string;
  summary?: string;
  full_text: string;
  audience?: string;
  tags?: string[] | string;
  faq?: KnowledgeArticleFaqEntry[];
  resolution_outline?: KnowledgeArticleOutlineEntry[];
  preventive_actions?: string[];
  validated_facts?: KnowledgeArticleValidatedFact[];
  source_ticket_id?: string;
  ticket_transcript?: string;
  author?: string;
}

export interface UpdateKnowledgeArticleRequest {
  persona?: string;
  title?: string;
  summary?: string;
  full_text?: string;
  audience?: string;
  tags?: string[] | string;
  faq?: KnowledgeArticleFaqEntry[];
  resolution_outline?: KnowledgeArticleOutlineEntry[];
  preventive_actions?: string[];
  validated_facts?: KnowledgeArticleValidatedFact[];
  ticket_transcript?: string;
  source_ticket_id?: string;
  auto_generated?: boolean;
  approved?: string | boolean;
}

export interface RejectKnowledgeQueueRequest {
  reviewer?: string;
  reason?: string;
}

export interface RejectKnowledgeQueueResponse {
  status: string;
  queue_id?: string;
  rejection_reason?: string;
}

export interface KnowledgeDocumentChunk {
  id: string;
  chunk_index?: number;
  content?: string;
  content_preview?: string;
  metadata?: Record<string, unknown>;
  file_id?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
  embedding?: number[] | null;
}

export interface KnowledgeDocumentChunksResponse {
  persona: string;
  file_id: string;
  chunks: KnowledgeDocumentChunk[];
  count: number;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ChatSource {
  id: string;
  preview?: string;
  source?: string;
}

export interface ChatActiveTicket {
  ticket_id?: string;
  status?: string;
  last_forwarded_at?: string;
  forwarded_via_glpi?: boolean;
}

export interface ChatTicketSectionClosed {
  ticket_id?: string | null;
  notice: string;
  closed_at?: string;
  status?: string;
  resolution_summary?: string | string[];
}

export interface ChatResponse {
  message: string;
  confidence: string;
  escalation_deferred: boolean;
  assist_attempts_with_kb: number;
  sources?: ChatSource[];
  router?: TicketRouteResponse | Record<string, unknown>;
  glpi_ticket_id?: string;
  ticket_forwarded?: boolean;
  ticket_status?: string;
  active_ticket?: ChatActiveTicket;
  ticket_section_closed?: ChatTicketSectionClosed;
}

export interface ChatRequest {
  persona_name: string;
  user_id: string;
  message: string;
}

export interface TicketMessageEntry {
  timestamp?: string;
  user_id?: string;
  sender?: string;
  message?: string;
}

export interface SupportTicket {
  id: string;
  ticket_id?: string;
  user_id?: string;
  persona?: string;
  status?: string;
  ticket_status?: string;
  escalation_reason?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  router_classification?: TicketClassification;
  router_payload?: unknown;
  transcript?: string;
  rag_metrics?: Record<string, unknown> | null;
  rag_chunks?: unknown[];
  customer_updates?: TicketMessageEntry[];
  messages?: TicketMessageEntry[];
  notes?: Array<Record<string, unknown>> | null;
  escalated_via?: string;
  glpi_response?: Record<string, unknown> | null;
  glpi_details?: Record<string, unknown> | null;
}

export interface TicketListParams {
  persona?: string;
  status?: "open" | "closed";
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TicketListResponse {
  tickets: SupportTicket[];
  count: number;
  total: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface TicketSummaryStats {
  total: number;
  open: number;
  closed: number;
  open_ratio: number;
  recent_limit?: number;
}

export interface TicketPersonaBreakdownItem {
  persona?: string;
  total: number;
  open: number;
  closed: number;
  last_updated?: string;
}

export interface TicketStatusBreakdownItem {
  status: string;
  count: number;
}

export interface TicketReasonBreakdownItem {
  reason?: string;
  count: number;
}

export interface TicketMetadataResponse {
  summary: TicketSummaryStats;
  by_persona: TicketPersonaBreakdownItem[];
  by_status: TicketStatusBreakdownItem[];
  top_escalation_reasons: TicketReasonBreakdownItem[];
  recent: SupportTicket[];
}
