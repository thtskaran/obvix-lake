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
