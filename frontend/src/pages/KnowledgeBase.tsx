import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveKnowledgeQueueItem,
  fetchKnowledgeQueue,
} from "../app/api/endpoints";
import KnowledgeArticleCreateForm from "../components/knowledge/KnowledgeArticleCreateForm";
import KnowledgeArticlesPanel from "../components/knowledge/KnowledgeArticlesPanel";
import KnowledgeChunkExplorer from "../components/knowledge/KnowledgeChunkExplorer";
import { usePersonas } from "../hooks/usePersonas";
import type { KnowledgeArticle, KnowledgeQueueItem } from "../types/api";

const STATUS_LABELS: Record<string, string> = {
  awaiting_approval: "Awaiting approval",
  requeued: "Requeued",
  published: "Published",
  error: "Error",
};

const statusBadgeClasses = (status?: string) => {
  switch (status) {
    case "awaiting_approval":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200";
    case "requeued":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
    case "published":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "error":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";
  }
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const summarize = (text?: string | string[], fallback = "No summary captured yet.") => {
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

export const KnowledgeBase = () => {
  const [items, setItems] = useState<KnowledgeQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("awaiting_approval");
  const [selectedPersona, setSelectedPersona] = useState<string>("all");
  const [autoApproveEnabled, setAutoApproveEnabled] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { personas } = usePersonas();
  const [articlesRefreshToken, setArticlesRefreshToken] = useState<number>(0);

  const defaultKnowledgePersona = useMemo(() => {
    if (selectedPersona !== "all" && selectedPersona) {
      return selectedPersona;
    }
    return personas[0];
  }, [personas, selectedPersona]);

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

  const handleArticleCreated = useCallback(
    (_article: KnowledgeArticle) => {
      setArticlesRefreshToken((prev) => prev + 1);
      void refresh();
    },
    [refresh],
  );

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

  const visibleItems = useMemo(() => {
    if (selectedPersona === "all") {
      return items;
    }
    return items.filter((item) => item.persona === selectedPersona);
  }, [items, selectedPersona]);

  const hasPersonas = personas.length > 0;
  const knowledgePanelKey = defaultKnowledgePersona ? `panel-${defaultKnowledgePersona}` : "panel-all";
  const chunkExplorerKey = defaultKnowledgePersona ? `chunks-${defaultKnowledgePersona}` : "chunks-all";

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Knowledge Base Pipeline
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg max-w-2xl">
              Review AI-drafted resolutions before they publish into persona knowledge stores.
            </p>
            {autoApproveEnabled && (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E89F88]/15 px-3 py-1 text-xs font-semibold text-[#E57252] dark:bg-blue-500/20 dark:text-blue-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#E57252] dark:bg-blue-300" />
                Auto-approve mode is enabled
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-[#6b5f57] dark:text-slate-400">
                Last synced {formatDate(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E89F88] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/50"
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

        <section className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-800/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300">
                Queue status
                <select
                  className="rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white dark:focus:ring-blue-500/40"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="awaiting_approval">Awaiting approval</option>
                  <option value="requeued">Requeued</option>
                  <option value="published">Published</option>
                  <option value="error">Failed</option>
                  <option value="all">All statuses</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300">
                Persona filter
                <select
                  className="rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white dark:focus:ring-blue-500/40"
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

              <div className="flex flex-col gap-1 rounded-xl border border-[#F5ECE5] bg-[#FDF3EF] px-4 py-3 text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
                <span className="text-xs uppercase tracking-wide text-[#E57252] dark:text-blue-300">Queue size</span>
                <span className="text-2xl font-semibold text-[#333333] dark:text-white">{visibleItems.length}</span>
                <span>{statusFilter === "all" ? "Total drafts after filters" : `Items marked ${STATUS_LABELS[statusFilter] ?? statusFilter}`}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : visibleItems.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
              No queue items match your filters right now.
            </div>
          ) : (
            visibleItems.map((item) => {
              const steps = extractSteps(item);
              const canApprove = ["awaiting_approval", "requeued"].includes(item.status ?? "");
              const approving = approvingId === item.id;
              return (
                <article
                  key={item.id}
                  className="flex h-full flex-col gap-5 rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm transition-colors hover:border-[#E89F88] hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/60"
                >
                  <header className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                        <span className="rounded-full bg-[#F5ECE5]/70 px-3 py-1 text-[#333333] dark:bg-slate-700/40 dark:text-slate-100">
                          {item.persona ?? "unknown persona"}
                        </span>
                        {item.ticket_id && (
                          <span className="rounded-full bg-[#E89F88]/10 px-3 py-1 text-[#E57252] dark:bg-blue-500/20 dark:text-blue-200">
                            Ticket {item.ticket_id}
                          </span>
                        )}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(item.status)}`}>
                        {STATUS_LABELS[item.status ?? ""] ?? item.status ?? "Unknown"}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#333333] dark:text-white">
                      {item.draft?.title || item.resolution?.problem_summary || `Draft ${item.id}`}
                    </h2>
                    <p className="text-sm leading-relaxed text-[#6b5f57] dark:text-slate-300">
                      {summarize(item.draft?.summary || item.resolution?.root_cause)}
                    </p>
                  </header>

                  {steps.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/70 p-4 text-sm text-[#333333] dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#E57252] dark:text-blue-300">
                        Resolution steps
                      </p>
                      <ol className="space-y-1">
                        {steps.slice(0, 4).map((step, index) => (
                          <li key={`${item.id}-step-${index}`} className="flex gap-2">
                            <span className="font-semibold text-[#E57252] dark:text-blue-300">{index + 1}.</span>
                            <span className="flex-1">{step}</span>
                          </li>
                        ))}
                        {steps.length > 4 && (
                          <li className="text-xs text-[#6b5f57] dark:text-slate-400">+{steps.length - 4} more steps in transcript</li>
                        )}
                      </ol>
                    </div>
                  )}

                  <footer className="mt-auto flex flex-col gap-3">
                    <div className="flex flex-wrap justify-between gap-3 text-xs text-[#6b5f57] dark:text-slate-400">
                      <span>Created {formatDate(item.created_at)}</span>
                      <span>Updated {formatDate(item.updated_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        disabled={!canApprove || approving}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E89F88] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/40"
                      >
                        {approving ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Approve & publish
                      </button>
                      <details className="group flex-[2] rounded-xl border border-[#F5ECE5] bg-white/80 px-4 py-3 text-sm text-[#6b5f57] transition-colors dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[#333333] dark:text-white">
                          View raw draft
                          <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <pre className="mt-3 max-h-56 overflow-auto text-xs text-left text-[#6b5f57] dark:text-slate-300">
{JSON.stringify(item.draft ?? item.resolution ?? {}, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </footer>
                </article>
              );
            })
          )}
        </section>

        {hasPersonas && (
          <section className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <KnowledgeArticlesPanel
                key={knowledgePanelKey}
                personas={personas}
                defaultPersona={defaultKnowledgePersona}
                refreshToken={articlesRefreshToken}
              />
            </div>
            <div className="xl:col-span-1">
              <KnowledgeArticleCreateForm
                personas={personas}
                defaultPersona={defaultKnowledgePersona}
                onCreated={handleArticleCreated}
              />
            </div>
          </section>
        )}

        {hasPersonas && (
          <KnowledgeChunkExplorer
            key={chunkExplorerKey}
            personas={personas}
            defaultPersona={defaultKnowledgePersona}
          />
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
