import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveKnowledgeQueueItem,
  fetchKnowledgeQueue,
  rejectKnowledgeQueueItem,
} from "../app/api/endpoints";
import { usePersonas } from "../hooks/usePersonas";
import type { KnowledgeQueueItem } from "../types/api";

const STATUS_LABELS: Record<string, string> = {
  awaiting_approval: "Awaiting approval",
  requeued: "Requeued",
  published: "Published",
  approved: "Approved",
  rejected: "Rejected",
  error: "Error",
};

const statusBadgeClasses = (status?: string) => {
  switch (status) {
    case "awaiting_approval":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200";
    case "requeued":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
    case "published":
    case "approved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    case "error":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";
  }
};

const formatDateRelative = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return parsed.toLocaleDateString();
};

const summarize = (text?: string | string[], fallback = "No summary available.") => {
  if (!text) return fallback;
  const value = Array.isArray(text) ? text.join("\n") : text;
  return value.trim() || fallback;
};

const extractSteps = (item: KnowledgeQueueItem) => {
  const draftSteps = item.draft?.steps;
  if (Array.isArray(draftSteps)) {
    return draftSteps.filter((step): step is string => typeof step === "string" && step.trim().length > 0);
  }
  if (typeof draftSteps === "string") {
    return draftSteps.split(/\n+/).map((step) => step.trim()).filter(Boolean);
  }
  const resolutionSteps = item.resolution?.solution_steps;
  if (Array.isArray(resolutionSteps)) {
    return resolutionSteps.filter((step): step is string => typeof step === "string" && step.trim().length > 0);
  }
  return [];
};

const extractFAQs = (item: KnowledgeQueueItem) => {
  const faqPairs = item.draft?.faq_pairs;
  if (Array.isArray(faqPairs)) {
    return faqPairs.filter((faq): faq is { question: string; answer: string } => 
      faq && typeof faq.question === "string" && typeof faq.answer === "string"
    );
  }
  return [];
};

const SkeletonCard = () => (
  <div className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/70 p-6 dark:bg-slate-800/60 animate-pulse space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-5 w-32 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
      <div className="h-5 w-20 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
    </div>
    <div className="h-6 w-3/4 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
    <div className="h-3 w-full rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
    <div className="h-3 w-5/6 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
    <div className="space-y-2">
      <div className="h-3 w-4/5 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
      <div className="h-3 w-2/3 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
      <div className="h-3 w-3/4 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
    </div>
    <div className="flex gap-2">
      <div className="h-9 w-24 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
      <div className="h-9 w-24 rounded-lg bg-[#F5ECE5] dark:bg-slate-700" />
    </div>
  </div>
);

export const KnowledgeReviewQueue = () => {
  const [items, setItems] = useState<KnowledgeQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("awaiting_approval");
  const [selectedPersona, setSelectedPersona] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [autoApproveEnabled, setAutoApproveEnabled] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { personas } = usePersonas();

  const loadQueue = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchKnowledgeQueue(
          statusFilter === "all" ? {} : { status: statusFilter },
          signal,
        );
        if (signal?.aborted) {
          return;
        }
        setItems(response.items);
        setAutoApproveEnabled(Boolean(response.auto_approve));
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "Unable to load knowledge queue.";
        setError(message);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadQueue(controller.signal);
    return () => controller.abort();
  }, [loadQueue]);

  const refresh = useCallback(async () => {
    await loadQueue();
  }, [loadQueue]);

  const handleApprove = async (itemId: string) => {
    setApprovingId(itemId);
    setError(null);
    try {
      await approveKnowledgeQueueItem(itemId);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Approval failed.";
      setError(message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (item: KnowledgeQueueItem) => {
    const confirmation = window.confirm("Reject this article from the knowledge queue?");
    if (!confirmation) {
      return;
    }
    const reasonInput = window.prompt("Optional: add a note for the rejection", "");
    const reason = reasonInput?.trim();
    setRejectingId(item.id);
    setError(null);
    try {
      await rejectKnowledgeQueueItem(item.id, reason ? { reason } : undefined);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reject failed.";
      setError(message);
    } finally {
      setRejectingId(null);
    }
  };

  const visibleItems = useMemo(() => {
    let filtered = items;
    
    if (selectedPersona !== "all") {
      filtered = filtered.filter((item) => item.persona === selectedPersona);
    }
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        const title = (item.draft?.title || "").toLowerCase();
        const summary = (item.draft?.summary || "").toLowerCase();
        const ticketId = (item.ticket_id || "").toLowerCase();
        return title.includes(search) || summary.includes(search) || ticketId.includes(search);
      });
    }
    
    return filtered;
  }, [items, selectedPersona, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = {
      awaiting_approval: 0,
      approved: 0,
      rejected: 0,
      published: 0,
      total: items.length,
    };
    items.forEach((item) => {
      const status = item.status || "";
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [items]);

  const toggleCardExpansion = (itemId: string) => {
    setExpandedCard(expandedCard === itemId ? null : itemId);
  };

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Knowledge Review Queue
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base max-w-2xl">
              Review and approve AI-generated knowledge articles from resolved tickets
            </p>
            {autoApproveEnabled && (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E89F88]/15 px-3 py-1 text-xs font-semibold text-[#E57252] dark:bg-blue-500/20 dark:text-blue-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#E57252] dark:bg-blue-300" />
                Auto-approve enabled
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-[#6b5f57] dark:text-slate-400">
                Updated {formatDateRelative(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E89F88] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19A9 9 0 0119 5" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#F5ECE5] bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-[#333333] dark:text-white">{statusCounts.awaiting_approval}</p>
          </div>
          <div className="rounded-xl border border-[#F5ECE5] bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Approved</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{statusCounts.approved + statusCounts.published}</p>
          </div>
          <div className="rounded-xl border border-[#F5ECE5] bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Rejected</p>
            <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">{statusCounts.rejected}</p>
          </div>
          <div className="rounded-xl border border-[#F5ECE5] bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-semibold text-[#333333] dark:text-white">{statusCounts.total}</p>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-800/60">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300">
              Status
              <select
                className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="awaiting_approval">Awaiting approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
                <option value="error">Failed</option>
                <option value="all">All statuses</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300">
              Persona
              <select
                className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                value={selectedPersona}
                onChange={(event) => setSelectedPersona(event.target.value)}
              >
                <option value="all">All personas</option>
                {personas.map((persona) => (
                  <option key={persona} value={persona}>
                    {persona}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 sm:col-span-2">
              Search
              <input
                type="text"
                placeholder="Search by title, description, or ticket ID..."
                className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}
        </section>

        {/* Queue Items */}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : visibleItems.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
              {searchTerm ? "No articles match your search." : "No queue items match your filters right now."}
            </div>
          ) : (
            visibleItems.map((item) => {
              const steps = extractSteps(item);
              const faqs = extractFAQs(item);
              const isExpanded = expandedCard === item.id;
              const canApprove = ["awaiting_approval", "requeued"].includes(item.status ?? "");
              const approving = approvingId === item.id;
              const rejecting = rejectingId === item.id;
              const confidence = item.resolution?.confidence;
              
              return (
                <article
                  key={item.id}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm transition-colors hover:border-[#E89F88] hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/60"
                >
                  <header className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                        <span className="rounded-full bg-[#F5ECE5]/70 px-3 py-1 text-[#333333] dark:bg-slate-700/40 dark:text-slate-100">
                          {item.persona ?? "unknown"}
                        </span>
                        {item.ticket_id && (
                          <span className="rounded-full bg-[#E89F88]/10 px-3 py-1 text-[#E57252] dark:bg-blue-500/20 dark:text-blue-200">
                            #{item.ticket_id}
                          </span>
                        )}
                        {confidence !== undefined && confidence !== null && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                            {Math.round((confidence as number) * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(item.status)}`}>
                        {STATUS_LABELS[item.status ?? ""] ?? item.status ?? "Unknown"}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-[#333333] dark:text-white">
                      {item.draft?.title || item.resolution?.problem_summary || `Draft ${item.id}`}
                    </h2>
                    <p className="text-sm leading-relaxed text-[#6b5f57] dark:text-slate-300">
                      {summarize(item.draft?.summary || item.resolution?.root_cause)}
                    </p>
                    {item.created_at && (
                      <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                        Created {formatDateRelative(item.created_at)}
                      </p>
                    )}
                  </header>

                  {/* Collapsible Details */}
                  {(steps.length > 0 || faqs.length > 0) && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => toggleCardExpansion(item.id)}
                        className="flex w-full items-center justify-between rounded-xl bg-[#F5ECE5]/50 px-4 py-2 text-sm font-medium text-[#333333] transition-colors hover:bg-[#F5ECE5] dark:bg-slate-700/40 dark:text-white dark:hover:bg-slate-700/60"
                      >
                        <span>View Details</span>
                        <svg
                          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="space-y-4">
                          {steps.length > 0 && (
                            <div className="space-y-2 rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/70 p-4 text-sm text-[#333333] dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#E57252] dark:text-blue-300">
                                Solution Steps
                              </p>
                              <ol className="space-y-1.5">
                                {steps.map((step, index) => (
                                  <li key={`${item.id}-step-${index}`} className="flex gap-2">
                                    <span className="font-semibold text-[#E57252] dark:text-blue-300">{index + 1}.</span>
                                    <span className="flex-1">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {faqs.length > 0 && (
                            <div className="space-y-2 rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/70 p-4 text-sm text-[#333333] dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#E57252] dark:text-blue-300">
                                FAQ Pairs
                              </p>
                              <div className="space-y-3">
                                {faqs.slice(0, 2).map((faq, index) => (
                                  <div key={`${item.id}-faq-${index}`} className="space-y-1">
                                    <p className="font-medium text-[#333333] dark:text-white">Q: {faq.question}</p>
                                    <p className="text-[#6b5f57] dark:text-slate-300">A: {faq.answer}</p>
                                  </div>
                                ))}
                                {faqs.length > 2 && (
                                  <p className="text-xs text-[#6b5f57] dark:text-slate-400">+{faqs.length - 2} more FAQ pairs</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <footer className="mt-auto flex flex-col gap-3">
                    {canApprove && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(item.id)}
                          disabled={approving || rejecting}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E89F88] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/40"
                        >
                          {approving ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          disabled={rejecting || approving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#F5ECE5] px-4 py-2.5 text-sm font-semibold text-[#E57252] transition-colors hover:border-[#E89F88] hover:text-[#D36847] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:border-[#F5ECE5] disabled:text-[#E89F88]/50 dark:border-slate-600/60 dark:text-blue-200 dark:hover:border-blue-400 dark:hover:text-blue-100"
                        >
                          {rejecting ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/50 border-t-current" />
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          Reject
                        </button>
                      </div>
                    )}
                    {item.approved_by && (
                      <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                        Reviewed by {item.approved_by}
                      </p>
                    )}
                  </footer>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
};

export default KnowledgeReviewQueue;
