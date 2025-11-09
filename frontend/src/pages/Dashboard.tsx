import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalyticsTrends, fetchMetrics } from "../app/api/endpoints";
import type { MetricsSnapshot, TrendCluster, TrendDirection } from "../types/api";

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatPercent = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return `${(value * 100).toFixed(1)}%`;
};

const formatRatio = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return `${value.toFixed(2)}×`;
};

const formatNumber = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return numberFormatter.format(Math.round(value));
};

const formatCsat = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return `${value.toFixed(2)} / 5`;
};

const formatHours = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  const totalMinutes = Math.max(0, Math.round(value * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours && !minutes) {
    return "<1m";
  }
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.join(" ");
};

const formatTimestamp = (value: string | undefined) => {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return dateFormatter.format(parsed);
};

const trendStyles: Record<TrendDirection | "default", { label: string; badge: string; dot: string }> = {
  emerging: {
    label: "Emerging",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
    dot: "bg-orange-500",
  },
  growing: {
    label: "Growing",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  declining: {
    label: "Declining",
    badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200",
    dot: "bg-red-500",
  },
  stable: {
    label: "Stable",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-200",
    dot: "bg-slate-400",
  },
  default: {
    label: "Unknown",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-200",
    dot: "bg-slate-400",
  },
};

const getTrendVisual = (trend?: TrendDirection) => trendStyles[trend ?? "default"];

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-36 rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 animate-pulse"
        />
      ))}
    </div>
    <div className="h-64 rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 animate-pulse" />
  </div>
);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error";
};

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [clusters, setClusters] = useState<TrendCluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      fetchMetrics(controller.signal),
      fetchAnalyticsTrends(controller.signal),
    ])
      .then(([metricsResult, trendsResult]) => {
        if (!isActive) {
          return;
        }

        const errors: string[] = [];

        if (metricsResult.status === "fulfilled") {
          setMetrics(metricsResult.value);
        } else if (!controller.signal.aborted) {
          errors.push(`Metrics: ${getErrorMessage(metricsResult.reason)}`);
        }

        if (trendsResult.status === "fulfilled") {
          setClusters(trendsResult.value.clusters);
        } else if (!controller.signal.aborted) {
          errors.push(`Trends: ${getErrorMessage(trendsResult.reason)}`);
        }

        setError(errors.length ? errors.join(" · ") : null);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [refreshIndex]);

  const handleRefresh = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  const assists = metrics?.assistive ?? null;
  const escalations = metrics?.human_agent ?? null;
  const assistiveRate = metrics?.assistive_rate ?? null;

  const metricCards = useMemo(() => {
    if (!metrics) {
      return [];
    }

    return [
      {
        id: "assistive",
        title: "AI Success Rate",
        value: formatPercent(metrics.assistive_rate),
        description: `${formatNumber(metrics.assistive, "0")} automated · ${formatNumber(
          metrics.human_agent,
          "0",
        )} to agents`,
        accent: "from-emerald-400/15 via-emerald-400/10 to-emerald-500/5",
        indicator: "bg-emerald-400",
      },
      {
        id: "csat",
        title: "Customer Satisfaction",
        value: formatCsat(metrics.avg_csat),
        description: "Average rating (30 days)",
        accent: "from-blue-400/15 via-blue-400/10 to-blue-500/5",
        indicator: "bg-blue-400",
      },
      {
        id: "resolution_time",
        title: "Resolution Time",
        value: formatHours(metrics.avg_resolution_hours),
        description: "Average time to close",
        accent: "from-amber-400/20 via-amber-400/10 to-amber-500/5",
        indicator: "bg-amber-400",
      },
      {
        id: "knowledge",
        title: "Knowledge Articles",
        value: formatRatio(metrics.knowledge_growth_ratio),
        description: "Growth ratio this month",
        accent: "from-purple-400/20 via-purple-400/10 to-purple-500/5",
        indicator: "bg-purple-400",
      },
    ];
  }, [metrics]);

  const topClusters = useMemo(() => clusters.slice(0, 5), [clusters]);

  const knowledgeTags = useMemo(() => {
    const tagSet = new Set<string>();
    clusters.forEach((cluster) => {
      cluster.top_entities.forEach((entity) => {
        if (entity) {
          tagSet.add(entity);
        }
      });
    });
    return Array.from(tagSet).slice(0, 8);
  }, [clusters]);

  const lastUpdated = useMemo(() => {
    const timestamps: string[] = [];
    if (metrics?.timestamp) {
      timestamps.push(metrics.timestamp);
    }
    clusters.forEach((cluster) => {
      if (cluster.last_updated) {
        timestamps.push(cluster.last_updated);
      }
    });
    if (!timestamps.length) {
      return undefined;
    }
    return timestamps
      .slice()
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [metrics, clusters]);

  const showSkeleton = isLoading && !metrics && clusters.length === 0;

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.05),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.12),transparent)] opacity-60" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base max-w-2xl">
              Monitor system performance and customer support metrics
            </p>
            <p className="text-xs text-[#9c8f86] dark:text-slate-500">
              Last updated: {formatTimestamp(lastUpdated)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <span className="text-xs font-medium text-[#E89F88] dark:text-blue-300 bg-[#E89F88]/10 dark:bg-blue-500/20 px-3 py-1 rounded-lg">
                Updating…
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F5ECE5] dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 px-4 py-2 text-sm font-medium text-[#333333] dark:text-slate-100 shadow-sm hover:shadow transition disabled:opacity-60"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.536 3.536A8.25 8.25 0 0019.5 12.75"
                />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 dark:border-red-500/40 bg-red-50/70 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            <div className="flex items-start gap-3">
              <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Some dashboard data is temporarily unavailable.</p>
                <p className="mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {showSkeleton ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-10">
            {metricCards.length ? (
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                {metricCards.map((card) => (
                  <article
                    key={card.id}
                    className="relative overflow-hidden rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 shadow-sm hover:shadow-lg transition group"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative p-5 lg:p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#9c8f86] dark:text-slate-400">
                          {card.title}
                        </span>
                        <span className={`h-2 w-2 rounded-full ${card.indicator} animate-pulse`} aria-hidden />
                      </div>
                      <p className="mt-3 text-3xl font-semibold text-[#333333] dark:text-white">{card.value}</p>
                      <p className="mt-3 text-sm text-[#6b5f57] dark:text-slate-400 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <p className="text-sm text-[#6b5f57] dark:text-slate-400">Metrics have not been generated yet.</p>
            )}

            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#333333] dark:text-white">Trending Topics</h2>
                  <p className="text-sm text-[#6b5f57] dark:text-slate-400">
                    Common ticket themes from customer support
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 px-3 py-1 text-xs text-[#6b5f57] dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-[#E89F88] dark:bg-blue-400 animate-pulse" aria-hidden />
                  {formatNumber(clusters.length, "0")} active clusters
                </span>
              </div>

              {topClusters.length ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {topClusters.map((cluster) => {
                    const visuals = getTrendVisual(cluster.trend);
                    return (
                      <article
                        key={`${cluster.cluster_id}-${cluster.label}`}
                        className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="text-base font-semibold text-[#333333] dark:text-white">
                              {cluster.label || `Topic ${cluster.cluster_id}`}
                            </h3>
                            <p className="mt-1 text-sm text-[#6b5f57] dark:text-slate-400">
                              {formatNumber(cluster.size, "0")} tickets
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${visuals.badge}`}>
                            <span className={`h-2 w-2 rounded-full ${visuals.dot}`} aria-hidden />
                            {visuals.label}
                          </span>
                        </div>
                        {cluster.top_entities.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {cluster.top_entities.slice(0, 4).map((entity) => (
                              <span
                                key={entity}
                                className="rounded-full bg-[#F5ECE5]/60 dark:bg-slate-700/50 px-3 py-1 text-xs text-[#6b5f57] dark:text-slate-200"
                              >
                                {entity}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#F5ECE5] dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 p-8 text-center text-sm text-[#6b5f57] dark:text-slate-400">
                  No trending topics yet. They will appear once we process more support tickets.
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <article className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#333333] dark:text-white mb-3">Performance (30 Days)</h3>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[#9c8f86] dark:text-slate-400">AI Resolved</dt>
                    <dd className="text-base font-semibold text-[#333333] dark:text-white">
                      {formatNumber(assists, "0")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[#9c8f86] dark:text-slate-400">Agent Handled</dt>
                    <dd className="text-base font-semibold text-[#333333] dark:text-white">
                      {formatNumber(escalations, "0")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#F5ECE5] dark:border-slate-700">
                    <dt className="text-sm text-[#9c8f86] dark:text-slate-400">Success Rate</dt>
                    <dd className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatPercent(assistiveRate)}
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#333333] dark:text-white mb-3">Top Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {knowledgeTags.length ? (
                    knowledgeTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#E89F88]/15 dark:bg-blue-500/15 px-3 py-1 text-xs font-medium text-[#E06F4F] dark:text-blue-200"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#9c8f86] dark:text-slate-400">
                      Keywords will appear here as tickets are processed
                    </span>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#333333] dark:text-white mb-3">Quick Stats</h3>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[#9c8f86] dark:text-slate-400">Avg CSAT Score</dt>
                    <dd className="text-base font-semibold text-[#333333] dark:text-white">
                      {formatCsat(metrics?.avg_csat)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[#9c8f86] dark:text-slate-400">Avg Resolution</dt>
                    <dd className="text-base font-semibold text-[#333333] dark:text-white">
                      {formatHours(metrics?.avg_resolution_hours)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#F5ECE5] dark:border-slate-700">
                    <dt className="text-sm text-[#9c8f86] dark:text-slate-400">Knowledge Growth</dt>
                    <dd className="text-base font-semibold text-purple-600 dark:text-purple-400">
                      {metrics?.knowledge_growth_ratio !== undefined && metrics?.knowledge_growth_ratio !== null
                        ? `${metrics.knowledge_growth_ratio.toFixed(1)}×`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;