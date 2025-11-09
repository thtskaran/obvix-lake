import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Search, RefreshCw } from "lucide-react";
import {
  fetchTickets,
  fetchTicketMetadata,
  routeTicket,
} from "../app/api/endpoints";
import type {
  SupportTicket,
  TicketRouteRequest,
  TicketRouteResponse,
  TicketClassification,
  TicketMetadataResponse,
  TicketListParams,
} from "../types/api";
import { usePersonas } from "../hooks/usePersonas";

interface RoutedTicket {
  id: string;
  createdAt: string;
  request: TicketRouteRequest & { metadata?: Record<string, unknown> };
  response: TicketRouteResponse;
}

const DEFAULT_PERSONA = "ol_rpi";
const TICKETS_PER_PAGE = 20;

function createTicketId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ticket_${Date.now()}`;
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return "Unknown";

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function getStatusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case "open":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
    case "closed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";
  }
}

function getUrgencyColor(urgency?: string): string {
  switch (urgency?.toLowerCase()) {
    case "urgent":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300";
    case "medium":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300";
    case "low":
      return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300";
  }
}

function isValidMetadata(metadata: unknown): metadata is Record<string, unknown> {
  return !!metadata && typeof metadata === "object" && !Array.isArray(metadata);
}

// Helper components
interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-[#E89F88] bg-[#FDF3EF] dark:border-blue-500/40 dark:bg-blue-500/10"
          : "border-[#F5ECE5] bg-white dark:border-slate-700/60 dark:bg-slate-800/60"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold text-[#333333] dark:text-white">{value}</div>
    </div>
  );
}

interface InfoCardProps {
  label: string;
  value: string;
}

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-lg bg-white border border-[#F5ECE5] dark:border-slate-700/60 dark:bg-slate-900/40 p-3">
      <div className="text-xs text-[#6b5f57] dark:text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-[#333333] dark:text-white capitalize">{value}</div>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#F5ECE5] dark:border-slate-700/60">
      <div className="text-sm text-[#6b5f57] dark:text-slate-400">
        Showing {startItem} - {endItem} of {totalItems}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-sm font-medium text-[#333333] dark:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <div className="flex items-center gap-2 px-3 text-sm text-[#6b5f57] dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-sm font-medium text-[#333333] dark:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

interface TicketLogEntryProps {
  ticket: SupportTicket;
  isExpanded: boolean;
  onToggle: () => void;
}

function TicketLogEntry({ ticket, isExpanded, onToggle }: TicketLogEntryProps) {
  // Check if router_classification is a valid object with actual data
  const hasClassificationData = 
    ticket.router_classification && 
    typeof ticket.router_classification === 'object' && 
    Object.keys(ticket.router_classification).length > 0 &&
    Object.values(ticket.router_classification).some(val => val !== null && val !== undefined);
  
  const classification = hasClassificationData 
    ? (ticket.router_classification as TicketClassification)
    : null;

  return (
    <div className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 overflow-hidden transition-all">
      {/* Collapsed View - Log Entry Style */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-[#6b5f57] dark:text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0 text-[#6b5f57] dark:text-slate-400" />
        )}

        <div className="flex-1 flex items-center gap-3 text-sm min-w-0">
          <span className="font-mono text-[#6b5f57] dark:text-slate-300 flex-shrink-0">
            #{ticket.ticket_id || ticket.id?.slice(0, 8) || "unknown"}
          </span>

          <span
            className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(ticket.status)}`}
          >
            {ticket.status?.toUpperCase() || "UNKNOWN"}
          </span>

          {classification?.urgency && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getUrgencyColor(classification.urgency)}`}
            >
              {classification.urgency.toUpperCase()}
            </span>
          )}

          <span className="text-[#333333] dark:text-slate-200 truncate flex-1">
            {ticket.escalation_reason || classification?.issue_category || "No description"}
          </span>

          <span className="text-xs text-[#6b5f57] dark:text-slate-400 flex-shrink-0">
            {formatRelativeTime(ticket.created_at)}
          </span>
        </div>
      </button>

      {/* Expanded View - Full Details */}
      {isExpanded && (
        <div className="border-t border-[#F5ECE5] dark:border-slate-700/60 bg-[#FDF3EF]/30 dark:bg-slate-900/40 p-6 space-y-6">
          {/* Ticket Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#333333] dark:text-white">
                Ticket #{ticket.ticket_id || ticket.id}
              </h3>
              <p className="text-sm text-[#6b5f57] dark:text-slate-400 mt-1">
                Created {formatTimestamp(ticket.created_at || "")}
                {ticket.updated_at && ` • Updated ${formatTimestamp(ticket.updated_at)}`}
                {ticket.closed_at && ` • Closed ${formatTimestamp(ticket.closed_at)}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
              {ticket.persona && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                  {ticket.persona}
                </span>
              )}
              {ticket.user_id && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {ticket.user_id}
                </span>
              )}
            </div>
          </div>

          {/* Escalation Reason / Description */}
          {ticket.escalation_reason && (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">Description</h4>
              <div className="rounded-lg bg-white dark:bg-slate-800/80 border border-[#F5ECE5] dark:border-slate-700/60 p-4 text-sm text-[#333333] dark:text-slate-200 whitespace-pre-line">
                {ticket.escalation_reason}
              </div>
            </div>
          )}

          {/* Classification */}
          {classification ? (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-3">Classification</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoCard label="Category" value={classification.issue_category || "N/A"} />
                <InfoCard label="Type" value={classification.issue_type || "N/A"} />
                <InfoCard label="Urgency" value={classification.urgency || "N/A"} />
                <InfoCard label="Impact" value={classification.impact_scope || "N/A"} />
                <InfoCard label="Sentiment" value={classification.sentiment || "N/A"} />
                <InfoCard label="Confidence" value={`${((classification.confidence || 0) * 100).toFixed(1)}%`} />
              </div>
            </div>
          ) : null}

          {/* Messages Timeline */}
          {ticket.messages && ticket.messages.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">
                Messages ({ticket.messages.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ticket.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-[#6b5f57] dark:text-slate-400 mb-1">
                      <span className="font-medium capitalize">{msg.sender || "Unknown"}</span>
                      <span>•</span>
                      <span>{formatTimestamp(msg.timestamp || "")}</span>
                      {msg.user_id && (
                        <>
                          <span>•</span>
                          <span>{msg.user_id}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-[#333333] dark:text-slate-200">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          {ticket.transcript && (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">Transcript</h4>
              <div className="rounded-lg bg-white dark:bg-slate-800/80 border border-[#F5ECE5] dark:border-slate-700/60 p-4 text-sm font-mono max-h-64 overflow-y-auto whitespace-pre-wrap">
                {ticket.transcript}
              </div>
            </div>
          )}

          {/* RAG Metrics */}
          {ticket.rag_metrics && Object.keys(ticket.rag_metrics).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">RAG Metrics</h4>
              <div className="rounded-lg bg-white dark:bg-slate-800/80 border border-[#F5ECE5] dark:border-slate-700/60 p-4">
                <pre className="text-xs overflow-x-auto text-[#333333] dark:text-slate-200">
                  {JSON.stringify(ticket.rag_metrics, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* GLPI Details */}
          {ticket.glpi_details && Object.keys(ticket.glpi_details).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">GLPI Integration</h4>
              <div className="rounded-lg bg-white dark:bg-slate-800/80 border border-[#F5ECE5] dark:border-slate-700/60 p-4">
                <pre className="text-xs overflow-x-auto text-[#333333] dark:text-slate-200">
                  {JSON.stringify(ticket.glpi_details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Tickets: React.FC = () => {
  // Backend tickets state
  const [backendTickets, setBackendTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [personaFilter, setPersonaFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  // Expanded ticket IDs
  const [expandedTicketIds, setExpandedTicketIds] = useState<Set<string>>(new Set());

  // Router test tool visibility
  const [isRouterTestExpanded, setIsRouterTestExpanded] = useState(false);

  // Router test states (existing)
  const [persona, setPersona] = useState<string>(DEFAULT_PERSONA);
  const [description, setDescription] = useState<string>("");
  const [metadataInput, setMetadataInput] = useState<string>("");
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routedTickets, setRoutedTickets] = useState<RoutedTicket[]>([]);
  const [activeController, setActiveController] = useState<AbortController | null>(null);

  const { personas } = usePersonas([DEFAULT_PERSONA]);
  const [ticketMetadata, setTicketMetadata] = useState<TicketMetadataResponse | null>(null);
  const [helpdeskError, setHelpdeskError] = useState<string | null>(null);

  // Load backend tickets
  const loadBackendTickets = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoadingTickets(true);
      setTicketsError(null);

      try {
        const params: TicketListParams = {
          limit: TICKETS_PER_PAGE,
          offset: (currentPage - 1) * TICKETS_PER_PAGE,
        };

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        if (personaFilter !== "all") {
          params.persona = personaFilter;
        }

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const response = await fetchTickets(params, signal);

        if (signal?.aborted) return;

        setBackendTickets(response.tickets);
        setTotalTickets(response.total);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        const message = error instanceof Error ? error.message : "Failed to load tickets";
        setTicketsError(message);
      } finally {
        setIsLoadingTickets(false);
      }
    },
    [currentPage, statusFilter, personaFilter, searchQuery]
  );

  // Load ticket metadata
  const loadHelpdeskData = useCallback(async (signal?: AbortSignal) => {
    setHelpdeskError(null);
    try {
      const metadataResponse = await fetchTicketMetadata(10, signal);
      if (signal?.aborted) {
        return;
      }
      setTicketMetadata(metadataResponse);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load ticket stats.";
      setHelpdeskError(message);
    }
  }, []);

  // Load tickets on mount and when filters change
  useEffect(() => {
    const controller = new AbortController();
    loadBackendTickets(controller.signal);
    return () => controller.abort();
  }, [loadBackendTickets]);

  // Load metadata on mount
  useEffect(() => {
    const controller = new AbortController();
    loadHelpdeskData(controller.signal);
    return () => controller.abort();
  }, [loadHelpdeskData]);

  // Auto-select persona
  useEffect(() => {
    if (!persona && personas.length) {
      const fallback = personas.includes(DEFAULT_PERSONA) ? DEFAULT_PERSONA : personas[0];
      setPersona(fallback);
    }
  }, [persona, personas]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, personaFilter, searchQuery]);

  // Toggle ticket expansion
  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTicketIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  // Router test submit handler (existing logic)
  const handleRouteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRouting) {
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setRouteError("Please provide a ticket description.");
      return;
    }

    let parsedMetadata: Record<string, unknown> | undefined;
    if (metadataInput.trim()) {
      try {
        const parsed = JSON.parse(metadataInput);
        if (!isValidMetadata(parsed)) {
          setRouteError("Metadata must be a JSON object.");
          return;
        }
        parsedMetadata = parsed;
      } catch {
        setRouteError("Metadata must be valid JSON.");
        return;
      }
    }

    const controller = new AbortController();
    setActiveController(controller);
    setIsRouting(true);
    setRouteError(null);

    const payload: TicketRouteRequest = {
      persona: persona.trim() || undefined,
      description: trimmedDescription,
      metadata: parsedMetadata,
      ticket_id: createTicketId(),
    };

    try {
      const response = await routeTicket(payload, controller.signal);
      const ticketId = response.ticket_id || payload.ticket_id || createTicketId();
      const ticketRecord: RoutedTicket = {
        id: ticketId,
        createdAt: new Date().toISOString(),
        request: {
          ...payload,
          metadata: parsedMetadata,
        },
        response,
      };
      setRoutedTickets((prev) => [ticketRecord, ...prev]);
      setDescription("");
      setMetadataInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to route ticket right now.";
      setRouteError(message);
    } finally {
      setIsRouting(false);
      setActiveController(null);
    }
  };

  // Cleanup
  useEffect(
    () => () => {
      activeController?.abort();
    },
    [activeController]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Stats and Filters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#333333] dark:text-white">Support Tickets</h1>
          <button
            onClick={() => setIsRouterTestExpanded(!isRouterTestExpanded)}
            className="text-sm text-[#E57252] hover:text-[#D68B72] dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            {isRouterTestExpanded ? "Hide" : "Show"} Router Test Tool
          </button>
        </div>

        {/* Stats Cards */}
        {!helpdeskError && ticketMetadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total" value={ticketMetadata.summary.total} />
            <StatCard label="Open" value={ticketMetadata.summary.open} accent />
            <StatCard label="Closed" value={ticketMetadata.summary.closed} />
            <StatCard label="Open %" value={`${(ticketMetadata.summary.open_ratio * 100).toFixed(0)}%`} />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "closed")}
            className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={personaFilter}
            onChange={(e) => setPersonaFilter(e.target.value)}
            className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
          >
            <option value="all">All Personas</option>
            {personas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5f57] dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 pl-10 pr-3 py-2 text-sm text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
            />
          </div>

          <button
            onClick={() => loadBackendTickets()}
            className="p-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-[#6b5f57] dark:text-slate-400 hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Router Test Tool */}
      {isRouterTestExpanded && (
        <div className="mb-6 rounded-2xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 backdrop-blur p-6">
          <h2 className="text-lg font-semibold text-[#333333] dark:text-white mb-4">Router Test Tool</h2>
          <p className="text-sm text-[#6b5f57] dark:text-slate-400 mb-4">
            Test the ticket routing logic with a sample description.
          </p>
          <form onSubmit={handleRouteSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#333333] dark:text-white mb-2">
                Persona
              </label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
              >
                {personas.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333333] dark:text-white mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the issue..."
                className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333333] dark:text-white mb-2">
                Metadata (JSON, optional)
              </label>
              <textarea
                value={metadataInput}
                onChange={(e) => setMetadataInput(e.target.value)}
                rows={2}
                placeholder='{"key": "value"}'
                className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm font-mono text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
              />
            </div>

            {routeError && (
              <div className="rounded-lg border border-red-200 bg-red-50/80 dark:border-red-800/60 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                {routeError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRouting}
              className="px-5 py-2.5 rounded-lg bg-[#E89F88] text-white text-sm font-semibold hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRouting ? "Routing..." : "Test Route"}
            </button>
          </form>

          {/* Router Test Results */}
          {routedTickets.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#F5ECE5] dark:border-slate-700/60">
              <h3 className="text-sm font-semibold text-[#333333] dark:text-white mb-3">
                Test Results ({routedTickets.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {routedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/40 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#333333] dark:text-white">{ticket.id}</span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-lg ${
                          ticket.response.decision === "assistive"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200"
                        }`}
                      >
                        {ticket.response.decision}
                      </span>
                    </div>
                    <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                      {ticket.response.classification.issue_category} • {ticket.response.classification.urgency} urgency
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Ticket List */}
      <div className="space-y-2">
        {isLoadingTickets ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-4 animate-pulse"
              >
                <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700/60 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : ticketsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50/80 dark:border-red-800/60 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {ticketsError}
          </div>
        ) : backendTickets.length === 0 ? (
          <div className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-8 text-center">
            <p className="text-sm text-[#6b5f57] dark:text-slate-400">No tickets found.</p>
          </div>
        ) : (
          backendTickets.map((ticket) => (
            <TicketLogEntry
              key={ticket.id}
              ticket={ticket}
              isExpanded={expandedTicketIds.has(ticket.id)}
              onToggle={() => toggleTicketExpansion(ticket.id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoadingTickets && !ticketsError && backendTickets.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalTickets}
          itemsPerPage={TICKETS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
