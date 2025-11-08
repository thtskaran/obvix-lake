import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHealthStatus } from "../app/api/endpoints";
import type { HealthResponse, ServiceHealth } from "../types/api";

const formatServiceName = (key: string) =>
  key
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const normalizeStatus = (status?: string) => (status ?? "unknown").toLowerCase();

const badgeClasses = (status?: string) => {
  switch (normalizeStatus(status)) {
    case "ok":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "error":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    case "disabled":
      return "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-200";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
  }
};

const ServiceCard = ({ name, health }: { name: string; health: ServiceHealth }) => {
  const statusText = normalizeStatus(health.status);
  const extraFields = Object.entries(health)
    .filter(([key]) => !["status"].includes(key))
    .map(([key, value]) => ({ key, value }));

  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-[#F5ECE5] bg-white/80 p-5 shadow-sm transition-colors hover:border-[#E89F88] hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/60">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#333333] dark:text-white">{formatServiceName(name)}</h3>
          <p className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Service status</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(health.status)}`}>
          {statusText}
        </span>
      </header>

      <div className="space-y-2 text-sm text-[#6b5f57] dark:text-slate-300">
        {extraFields.length === 0 ? (
          <p>No additional telemetry reported.</p>
        ) : (
          extraFields.map(({ key, value }) => (
            <div key={key} className="flex flex-col rounded-xl bg-[#FDF3EF]/80 px-4 py-3 dark:bg-slate-900/40">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#E57252] dark:text-blue-300">
                {formatServiceName(key)}
              </span>
              <span className="text-sm text-[#333333] dark:text-slate-200">
                {typeof value === "string" || typeof value === "number"
                  ? value.toString()
                  : JSON.stringify(value, null, 2)}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
};

export const Settings = () => {
  const [health, setHealth] = useState<HealthResponse>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchHealthStatus(signal);
      if (signal?.aborted) {
        return;
      }
      setHealth(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to load health status.";
      setError(message);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadHealth(controller.signal);
    return () => controller.abort();
  }, [loadHealth]);

  const refresh = useCallback(async () => {
    await loadHealth();
  }, [loadHealth]);

  const summary = useMemo(() => {
    const entries = Object.values(health);
    const total = entries.length;
    const ok = entries.filter((record) => normalizeStatus(record.status) === "ok").length;
    const errorCount = entries.filter((record) => normalizeStatus(record.status) === "error").length;
    const disabled = entries.filter((record) => normalizeStatus(record.status) === "disabled").length;
    const other = total - ok - errorCount - disabled;
    return { total, ok, error: errorCount, disabled, other };
  }, [health]);

  const serviceEntries = Object.entries(health);

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Platform Settings & Health
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg">
              Monitor backend integrations and adjust console preferences.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
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
              Refresh health
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
            <p className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Services monitored</p>
            <p className="text-3xl font-semibold text-[#333333] dark:text-white">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-[#DEF7EC] bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/20">
            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Healthy</p>
            <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-100">{summary.ok}</p>
          </div>
          <div className="rounded-2xl border border-[#FFE5E5] bg-red-50/80 p-4 shadow-sm dark:border-red-500/40 dark:bg-red-500/20">
            <p className="text-xs uppercase tracking-wide text-red-700 dark:text-red-200">Issues detected</p>
            <p className="text-3xl font-semibold text-red-700 dark:text-red-100">{summary.error}</p>
          </div>
          <div className="rounded-2xl border border-[#F5ECE5] bg-[#FDF3EF]/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-[#E57252] dark:text-blue-300">Disabled / other</p>
            <p className="text-3xl font-semibold text-[#333333] dark:text-white">{summary.disabled + summary.other}</p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {isLoading ? (
            <>
              <div className="h-48 animate-pulse rounded-2xl border border-[#F5ECE5] bg-white/70 dark:border-slate-700/60 dark:bg-slate-800/60" />
              <div className="h-48 animate-pulse rounded-2xl border border-[#F5ECE5] bg-white/70 dark:border-slate-700/60 dark:bg-slate-800/60" />
            </>
          ) : serviceEntries.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[#F5ECE5] bg-white/70 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
              No health telemetry available from the server.
            </div>
          ) : (
            serviceEntries.map(([service, record]) => (
              <ServiceCard key={service} name={service} health={record} />
            ))
          )}
        </section>
      </div>
    </div>
  );
};