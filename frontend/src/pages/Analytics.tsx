import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalyticsTrends, fetchMetrics } from "../app/api/endpoints";
import type { MetricsSnapshot, TrendCluster, TrendDirection } from "../types/api";

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1, minimumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatNumber = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return numberFormatter.format(Math.round(value));
};

const formatPercent = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return percentFormatter.format(Math.min(Math.max(value, 0), 1));
};

const formatHours = (value: number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  const minutes = Math.round(value * 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours && !remainder) return "<1m";
  return `${hours ? `${hours}h` : ""}${hours && remainder ? " " : ""}${remainder ? `${remainder}m` : ""}`.trim();
};

const formatCsat = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(2)} / 5`;
};

const formatTimestamp = (value: string | undefined) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
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

const getTrendDefinition = (trend?: TrendDirection) => trendStyles[trend ?? "default"];

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 animate-pulse" />
      ))}
    </div>
    <div className="h-72 rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 animate-pulse" />
  </div>
);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error";
};

export const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [trends, setTrends] = useState<TrendCluster[]>([]);
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
        if (!isActive) return;

        const errors: string[] = [];

        if (metricsResult.status === "fulfilled") {
          setMetrics(metricsResult.value);
        } else if (!controller.signal.aborted) {
          errors.push(`Metrics: ${getErrorMessage(metricsResult.reason)}`);
        }

        if (trendsResult.status === "fulfilled") {
          setTrends(trendsResult.value.clusters);
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

  const trendCounts = useMemo(() => {
    return trends.reduce(
      (acc, cluster) => {
        const key = cluster.trend ?? "default";
        acc[key] = (acc[key] ?? 0) + 1;
        acc.total += cluster.size;
        return acc;
      },
      { emerging: 0, growing: 0, stable: 0, declining: 0, default: 0, total: 0 } as Record<string, number>,
    );
  }, [trends]);

  const lastUpdated = useMemo(() => {
    const timestamps: string[] = [];
    if (metrics?.timestamp) timestamps.push(metrics.timestamp);
    trends.forEach((cluster) => {
      if (cluster.last_updated) timestamps.push(cluster.last_updated);
    });
    if (!timestamps.length) return undefined;
    return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [metrics, trends]);

  const topCluster = useMemo(() => trends[0], [trends]);
  const showSkeleton = isLoading && !metrics && !trends.length;

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(232,159,136,0.05),transparent)] dark:bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.14),transparent)] opacity-60" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Analytics
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base max-w-2xl">
              Insights from customer support patterns and ticket trends
            </p>
            <p className="text-xs text-[#9c8f86] dark:text-slate-500">
              Last updated: {formatTimestamp(lastUpdated)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <span className="text-xs font-medium text-[#E89F88] dark:text-blue-300 bg-[#E89F88]/10 dark:bg-blue-500/20 px-3 py-1 rounded-lg">
                Loading…
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F5ECE5] dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 px-4 py-2 text-sm font-medium text-[#333333] dark:text-slate-100 shadow-sm hover:shadow transition disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.536 3.536A8.25 8.25 0 0019.5 12.75" />
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
                <p className="font-medium">Some analytics data failed to load.</p>
                <p className="mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {showSkeleton ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-10">
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
              <article className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
                <h2 className="text-xs uppercase tracking-wide text-[#9c8f86] dark:text-slate-400">
                  Total Tickets
                </h2>
                <p className="mt-2 text-2xl font-semibold text-[#333333] dark:text-white">{formatNumber(trendCounts.total)}</p>
                <p className="mt-1 text-sm text-[#6b5f57] dark:text-slate-400">
                  {formatNumber(trends.length)} topic clusters
                </p>
              </article>

              <article className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
                <h2 className="text-xs uppercase tracking-wide text-[#9c8f86] dark:text-slate-400">
                  AI Success Rate
                </h2>
                <p className="mt-2 text-2xl font-semibold text-[#333333] dark:text-white">{formatPercent(metrics?.assistive_rate)}</p>
                <p className="mt-1 text-sm text-[#6b5f57] dark:text-slate-400">Last 30 days</p>
              </article>

              <article className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
                <h2 className="text-xs uppercase tracking-wide text-[#9c8f86] dark:text-slate-400">
                  Customer Satisfaction
                </h2>
                <p className="mt-2 text-2xl font-semibold text-[#333333] dark:text-white">{formatCsat(metrics?.avg_csat)}</p>
                <p className="mt-1 text-sm text-[#6b5f57] dark:text-slate-400">Average rating</p>
              </article>

              <article className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
                <h2 className="text-xs uppercase tracking-wide text-[#9c8f86] dark:text-slate-400">
                  Resolution Time
                </h2>
                <p className="mt-2 text-2xl font-semibold text-[#333333] dark:text-white">{formatHours(metrics?.avg_resolution_hours)}</p>
                <p className="mt-1 text-sm text-[#6b5f57] dark:text-slate-400">Average time</p>
              </article>
            </section>

            <section className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 shadow-sm overflow-hidden">
              <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-[#F5ECE5] dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold text-[#333333] dark:text-white">Ticket Topics</h2>
                  <p className="text-sm text-[#6b5f57] dark:text-slate-400">
                    Common themes identified from support interactions
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[#6b5f57] dark:text-slate-400">
                  {(["growing", "emerging", "stable", "declining"] as TrendDirection[]).map((trend) => {
                    const visuals = getTrendDefinition(trend);
                    return (
                      <span key={trend} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${visuals.badge}`}>
                        <span className={`h-2 w-2 rounded-full ${visuals.dot}`} aria-hidden />
                        {visuals.label}: {formatNumber(trendCounts[trend] ?? 0)}
                      </span>
                    );
                  })}
                </div>
              </header>

              {trends.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#F5ECE5] dark:divide-slate-700">
                    <thead className="bg-[#FDF7F4] dark:bg-slate-800/70">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#9c8f86] dark:text-slate-400">
                          Topic
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#9c8f86] dark:text-slate-400">
                          Count
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#9c8f86] dark:text-slate-400">
                          Status
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#9c8f86] dark:text-slate-400">
                          Keywords
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5ECE5] dark:divide-slate-800/60">
                      {trends.map((cluster) => {
                        const visuals = getTrendDefinition(cluster.trend);
                        return (
                          <tr key={`${cluster.cluster_id}-${cluster.label}`} className="hover:bg-[#FDF7F4]/70 dark:hover:bg-slate-800/50 transition">
                            <td className="px-5 py-4 align-top">
                              <div className="text-sm font-semibold text-[#333333] dark:text-white">
                                {cluster.label || `Topic ${cluster.cluster_id}`}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-[#6b5f57] dark:text-slate-300 align-top">
                              {formatNumber(cluster.size)}
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${visuals.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${visuals.dot}`} aria-hidden />
                                {visuals.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                {cluster.top_entities.slice(0, 3).map((entity) => (
                                  <span
                                    key={entity}
                                    className="rounded-full bg-[#E89F88]/15 dark:bg-blue-500/15 px-3 py-1 text-xs text-[#E06F4F] dark:text-blue-200"
                                  >
                                    {entity}
                                  </span>
                                ))}
                                {!cluster.top_entities.length && (
                                  <span className="text-xs text-[#9c8f86] dark:text-slate-500">None</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-[#6b5f57] dark:text-slate-400">
                  No topics detected yet. They will appear as we process support tickets.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#F5ECE5] dark:border-slate-700 bg-white/85 dark:bg-slate-800/50 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#333333] dark:text-white mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <article className="rounded-xl border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-4 py-3">
                  <h3 className="text-xs uppercase tracking-wide text-[#9c8f86] dark:text-slate-400">Most Active</h3>
                  {topCluster ? (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-[#333333] dark:text-white">{topCluster.label || `Topic ${topCluster.cluster_id}`}</p>
                      <p className="text-xs text-[#6b5f57] dark:text-slate-400 mt-1">{formatNumber(topCluster.size)} tickets</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#6b5f57] dark:text-slate-400">None detected</p>
                  )}
                </article>

                <article className="rounded-xl border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-4 py-3">
                  <h3 className="text-xs uppercase tracking-wide text-[#9c8f86] dark:text-slate-400">Knowledge Growth</h3>
                  <p className="mt-2 text-sm font-semibold text-[#333333] dark:text-white">
                    {metrics?.knowledge_growth_ratio !== undefined && metrics?.knowledge_growth_ratio !== null
                      ? `${metrics.knowledge_growth_ratio.toFixed(1)}×`
                      : "—"}
                  </p>
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400 mt-1">
                    Ratio this month
                  </p>
                </article>

                <article className="rounded-xl border border-[#F5ECE5] dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-4 py-3">
                  <h3 className="text-xs uppercase tracking-wide text-[#9c8f86] dark:text-slate-400">Active Topics</h3>
                  <p className="mt-2 text-sm font-semibold text-[#333333] dark:text-white">
                    {formatPercent(trends.length ? (trendCounts.growing + trendCounts.emerging) / trends.length : 0)}
                  </p>
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400 mt-1">
                    Growing or emerging
                  </p>
                </article>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;