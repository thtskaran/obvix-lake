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
