import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchTicketMetadata,
  routeTicket,
  submitFeedback,
} from "../app/api/endpoints";
import type {
  FeedbackRequest,
  TicketRouteRequest,
  TicketRouteResponse,
  TicketClassification,
  TicketKnowledgeMatch,
  TicketMetadataResponse,
} from "../types/api";
import { usePersonas } from "../hooks/usePersonas";

interface RoutedTicket {
  id: string;
  createdAt: string;
  request: TicketRouteRequest & { metadata?: Record<string, unknown> };
  response: TicketRouteResponse;
}

type FeedbackStatus = "idle" | "submitting" | "success" | "error";

interface FeedbackState {
  rating: number;
  comment: string;
  status: FeedbackStatus;
  error?: string;
}

const DEFAULT_PERSONA = "ol_rpi";

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

function formatSimilarity(similarity: number): string {
  if (Number.isNaN(similarity)) {
    return "-";
  }
  return `${Math.round(similarity * 100)}%`;
}

function isValidMetadata(metadata: unknown): metadata is Record<string, unknown> {
  return !!metadata && typeof metadata === "object" && !Array.isArray(metadata);
}

export const Tickets: React.FC = () => {
  const [persona, setPersona] = useState<string>(DEFAULT_PERSONA);
  const [description, setDescription] = useState<string>("");
  const [metadataInput, setMetadataInput] = useState<string>("");
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [tickets, setTickets] = useState<RoutedTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeController, setActiveController] = useState<AbortController | null>(null);
  const [feedbackStates, setFeedbackStates] = useState<Record<string, FeedbackState>>({});
  const { personas, error: personasError } = usePersonas([DEFAULT_PERSONA]);
  const [ticketMetadata, setTicketMetadata] = useState<TicketMetadataResponse | null>(null);
  const [helpdeskError, setHelpdeskError] = useState<string | null>(null);

  useEffect(() => () => {
    activeController?.abort();
  }, [activeController]);

  useEffect(() => {
    if (!tickets.length || selectedTicketId) {
      return;
    }
    setSelectedTicketId(tickets[0].id);
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (!persona && personas.length) {
      const fallback = personas.includes(DEFAULT_PERSONA) ? DEFAULT_PERSONA : personas[0];
      setPersona(fallback);
    }
  }, [persona, personas]);

  useEffect(() => {
    if (!selectedTicketId) {
      return;
    }
    setFeedbackStates((prev) => {
      if (prev[selectedTicketId]) {
        return prev;
      }
      return {
        ...prev,
        [selectedTicketId]: {
          rating: 5,
          comment: "",
          status: "idle",
        },
      };
    });
  }, [selectedTicketId]);

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) {
      return null;
    }
    return tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  }, [tickets, selectedTicketId]);

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

  useEffect(() => {
    const controller = new AbortController();
    loadHelpdeskData(controller.signal);
    return () => controller.abort();
  }, [loadHelpdeskData]);

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
      setTickets((prev) => [ticketRecord, ...prev]);
      setSelectedTicketId(ticketId);
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

  const updateFeedbackState = (ticketId: string, updater: (state: FeedbackState) => FeedbackState) => {
    setFeedbackStates((prev) => {
      const current = prev[ticketId] ?? { rating: 5, comment: "", status: "idle" };
      return {
        ...prev,
        [ticketId]: updater(current),
      };
    });
  };

  const handleFeedbackSubmit = async (ticket: RoutedTicket) => {
    const state = feedbackStates[ticket.id];
    if (!state) {
      return;
    }

    if (state.status === "submitting" || state.status === "success") {
      return;
    }

    if (state.rating < 1 || state.rating > 5) {
      updateFeedbackState(ticket.id, (current) => ({
        ...current,
        error: "Rating must be between 1 and 5.",
      }));
      return;
    }

    const feedbackPayload: FeedbackRequest = {
      rating: state.rating,
      comment: state.comment.trim() ? state.comment.trim() : undefined,
      ticket_id: ticket.id,
      persona: ticket.request.persona,
      source: "agent",
    };

    updateFeedbackState(ticket.id, (current) => ({
      ...current,
      status: "submitting",
      error: undefined,
    }));

    try {
      await submitFeedback(feedbackPayload);
      updateFeedbackState(ticket.id, (current) => ({
        ...current,
        comment: "",
        status: "success",
        error: undefined,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit feedback.";
      updateFeedbackState(ticket.id, (current) => ({
        ...current,
        status: "error",
        error: message,
      }));
    }
  };

  const renderClassification = (classification: TicketClassification) => (
    <details className="rounded-xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/40 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-[#333333] dark:text-white">
        Classification Details
      </summary>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Category</span>
          <span className="text-base font-medium text-[#333333] dark:text-white">{classification.issue_category}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Urgency</span>
          <span className="text-base font-medium text-[#333333] dark:text-white">{classification.urgency}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Sentiment</span>
          <span className="text-base font-medium text-[#333333] dark:text-white">{classification.sentiment}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Human Required</span>
          <span className="text-base font-medium text-[#333333] dark:text-white">{classification.requires_human ? "Yes" : "No"}</span>
        </div>
      </div>
    </details>
  );

  const renderMatch = (match: TicketKnowledgeMatch, index: number) => (
    <div
      key={`${match.article_id ?? "match"}-${index}`}
      className="rounded-xl border border-[#F5ECE5] dark:border-slate-600/40 bg-white/70 dark:bg-slate-800/50 p-4"
    >
      <div className="flex justify-between items-start gap-4 mb-2">
        <div>
          <p className="text-sm font-semibold text-[#333333] dark:text-white">
            {match.title || `Match ${index + 1}`}
          </p>
          {match.article_id && (
            <p className="text-xs text-[#6b5f57] dark:text-slate-400">Article ID: {match.article_id}</p>
          )}
          {match.source_ticket_id && (
            <p className="text-xs text-[#6b5f57] dark:text-slate-400">Source Ticket: {match.source_ticket_id}</p>
          )}
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-[#E89F88]/15 dark:bg-blue-500/20 text-[#E57252] dark:text-blue-300">
          {formatSimilarity(match.similarity)} match
        </span>
      </div>
      {match.content && (
        <p className="text-sm leading-relaxed text-[#6b5f57] dark:text-slate-300 whitespace-pre-line">
          {match.content}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.15),transparent)] opacity-60" />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#333333] dark:text-white tracking-tight">
            Tickets
          </h1>
          <p className="text-[#6b5f57] dark:text-slate-400 text-base max-w-3xl">
            Submit support tickets and review routing decisions.
          </p>
        </header>

        <section className="bg-white/80 dark:bg-slate-800/60 backdrop-blur border border-[#F5ECE5] dark:border-slate-700/60 rounded-2xl shadow-sm">
          <form className="p-6 lg:p-8 space-y-6" onSubmit={handleRouteSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,3fr] gap-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-[#6b5f57] dark:text-slate-300">
                  Category (optional)
                  <div className="mt-2">
                    <input
                      className="w-full rounded-xl border border-[#F5ECE5] dark:border-slate-600/50 bg-white/80 dark:bg-slate-900/40 px-4 py-3 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:focus:ring-blue-500/40"
                      placeholder="e.g., ol_rpi"
                      value={persona}
                      onChange={(event) => setPersona(event.target.value)}
                      list={personas.length ? "persona-options" : undefined}
                      autoComplete="off"
                    />
                    {personasError ? (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                        Unable to load categories.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-[#6b5f57] dark:text-slate-400">
                        Leave empty for default category.
                      </p>
                    )}
                  </div>
                </label>
              </div>

              <label className="block text-sm font-medium text-[#6b5f57] dark:text-slate-300">
                Issue Description
                <textarea
                  className="mt-2 h-full min-h-[160px] w-full rounded-2xl border border-[#F5ECE5] dark:border-slate-600/50 bg-white/90 dark:bg-slate-900/40 px-4 py-4 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:focus:ring-blue-500/40"
                  placeholder="Describe the issue you're experiencing..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
            </div>

            {routeError && (
              <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800/70 dark:bg-red-500/10 dark:text-red-200">
                {routeError}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E89F88] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/50"
                disabled={isRouting}
              >
                {isRouting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  "Submit Ticket"
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 backdrop-blur p-6">
              <h2 className="text-lg font-semibold text-[#333333] dark:text-white mb-4">System Overview</h2>
              {helpdeskError ? (
                <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-800/60 dark:bg-red-500/10 dark:text-red-200">
                  Unable to load stats
                </div>
              ) : ticketMetadata ? (
                <div className="grid grid-cols-2 gap-3 text-sm text-[#6b5f57] dark:text-slate-300">
                  <div className="rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <span className="text-xs uppercase tracking-wide text-[#E57252] dark:text-blue-300">Total</span>
                    <p className="text-xl font-semibold text-[#333333] dark:text-white">{ticketMetadata.summary.total}</p>
                  </div>
                  <div className="rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <span className="text-xs uppercase tracking-wide text-[#E57252] dark:text-blue-300">Open</span>
                    <p className="text-xl font-semibold text-[#333333] dark:text-white">{ticketMetadata.summary.open}</p>
                  </div>
                  <div className="rounded-xl border border-[#F5ECE5] bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <span className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Closed</span>
                    <p className="text-xl font-semibold text-[#333333] dark:text-white">{ticketMetadata.summary.closed}</p>
                  </div>
                  <div className="rounded-xl border border-[#F5ECE5] bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <span className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Open %</span>
                    <p className="text-xl font-semibold text-[#333333] dark:text-white">{(ticketMetadata.summary.open_ratio * 100).toFixed(0)}%</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-4 w-24 rounded-md bg-[#F5ECE5] dark:bg-slate-700 animate-pulse" />
                  <div className="h-24 rounded-xl bg-[#F5ECE5]/70 dark:bg-slate-700/60 animate-pulse" />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 backdrop-blur p-6">
              <h2 className="text-lg font-semibold text-[#333333] dark:text-white mb-3">Submitted Tickets</h2>
              {tickets.length === 0 ? (
                <p className="text-sm text-[#6b5f57] dark:text-slate-400">
                  No tickets submitted yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const isSelected = ticket.id === selectedTicketId;
                    const classification = ticket.response.classification;
                    return (
                      <button
                        type="button"
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-[#E89F88] bg-[#E89F88]/10 dark:border-blue-500 dark:bg-blue-500/10"
                            : "border-[#F5ECE5] bg-white/70 hover:bg-[#F5ECE5]/60 dark:border-slate-700/50 dark:bg-slate-900/30 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[#333333] dark:text-white truncate" title={ticket.request.description}>
                            {ticket.id}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                            ticket.response.decision === "assistive"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200"
                          }`}>
                            {ticket.response.decision}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6b5f57] dark:text-slate-400">
                          <span className="rounded-md bg-[#F5ECE5]/70 px-2 py-1 dark:bg-slate-700/40">
                            {classification.urgency} urgency
                          </span>
                          <span>{classification.issue_category}</span>
                          <span>• {formatTimestamp(ticket.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            {selectedTicket ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/60 backdrop-blur p-6 lg:p-8">
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <h2 className="text-xl font-semibold text-[#333333] dark:text-white">Ticket Details</h2>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        selectedTicket.response.assistive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200"
                      }`}>
                        {selectedTicket.response.assistive ? "Auto-handled" : "Needs Review"}
                      </span>
                    </div>
                    <p className="text-sm text-[#6b5f57] dark:text-slate-400">
                      Submitted {formatTimestamp(selectedTicket.createdAt)}
                    </p>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6b5f57] dark:text-slate-400 mb-2">
                      Description
                    </h3>
                    <div className="rounded-xl border border-[#F5ECE5] dark:border-slate-700/60 bg-[#FDF3EF] dark:bg-slate-900/40 p-4 text-sm text-[#333333] dark:text-slate-200 whitespace-pre-line">
                      {selectedTicket.request.description}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h3 className="text-base font-semibold text-[#333333] dark:text-white mb-3">
                        Ticket Analysis
                      </h3>
                      {renderClassification(selectedTicket.response.classification)}
                    </section>

                    {selectedTicket.response.matches.length > 0 && (
                      <section>
                        <h3 className="text-base font-semibold text-[#333333] dark:text-white mb-3">
                          Related Articles ({selectedTicket.response.matches.length})
                        </h3>
                        <div className="space-y-4">
                          {selectedTicket.response.matches.map(renderMatch)}
                        </div>
                      </section>
                    )}

                    <section className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/40 p-5">
                      <h3 className="text-base font-semibold text-[#333333] dark:text-white mb-3">Feedback</h3>
                      <p className="text-sm text-[#6b5f57] dark:text-slate-400 mb-4">
                        Rate how well this ticket was handled.
                      </p>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {[1, 2, 3, 4, 5].map((value) => {
                            const feedback = feedbackStates[selectedTicket.id];
                            const isActive = feedback?.rating === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  updateFeedbackState(selectedTicket.id, (current) => ({
                                    ...current,
                                    rating: value,
                                    error: undefined,
                                  }))
                                }
                                className={`w-10 h-10 rounded-full border text-sm font-semibold transition-colors ${
                                  isActive
                                    ? "border-[#E89F88] bg-[#E89F88] text-white"
                                    : "border-[#F5ECE5] bg-white/70 text-[#333333] hover:bg-[#F5ECE5]/60 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
                                }`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>

                        <textarea
                          className="w-full rounded-xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/40 px-4 py-3 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
                          placeholder="Optional context for this rating"
                          value={feedbackStates[selectedTicket.id]?.comment ?? ""}
                          onChange={(event) =>
                            updateFeedbackState(selectedTicket.id, (current) => ({
                              ...current,
                              comment: event.target.value,
                              error: undefined,
                            }))
                          }
                          rows={3}
                        />

                        {feedbackStates[selectedTicket.id]?.error && (
                          <p className="text-sm text-red-600 dark:text-red-300">
                            {feedbackStates[selectedTicket.id]?.error}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleFeedbackSubmit(selectedTicket)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#E89F88] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 disabled:cursor-not-allowed disabled:bg-[#E89F88]/50"
                            disabled={feedbackStates[selectedTicket.id]?.status === "submitting" || feedbackStates[selectedTicket.id]?.status === "success"}
                          >
                            {feedbackStates[selectedTicket.id]?.status === "submitting" ? "Submitting..." : "Submit feedback"}
                          </button>
                          {feedbackStates[selectedTicket.id]?.status === "success" && (
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                              Thanks! Feedback recorded.
                            </span>
                          )}
                          {feedbackStates[selectedTicket.id]?.status === "error" && (
                            <span className="text-sm text-red-600 dark:text-red-300">
                              {feedbackStates[selectedTicket.id]?.error}
                            </span>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#F5ECE5] dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/50 p-10 text-center">
                <p className="text-lg font-medium text-[#6b5f57] dark:text-slate-300">
                  Route a ticket to inspect the router's decision path.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {personas.length ? (
        <datalist id="persona-options">
          {personas.map((slug) => (
            <option key={slug} value={slug} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
};

export default Tickets;