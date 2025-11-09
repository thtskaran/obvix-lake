import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHealthStatus, fetchSettings, updateSettings, resetSettings, type SystemSettings } from "../app/api/endpoints";
import type { HealthResponse, ServiceHealth } from "../types/api";

const normalizeStatus = (status?: string) => (status ?? "unknown").toLowerCase();

const Tooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#E89F88]/20 text-[#E89F88] hover:bg-[#E89F88]/30 transition-colors"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {show && (
        <div className="absolute left-6 top-0 z-50 w-64 rounded-lg border border-[#F5ECE5] bg-white p-3 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          <p className="text-xs text-[#6b5f57] dark:text-slate-300">{text}</p>
        </div>
      )}
    </div>
  );
};

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

const HealthCard = ({ name, health }: { name: string; health: ServiceHealth }) => {
  const statusText = normalizeStatus(health.status);
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#F5ECE5] bg-white/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-800/60">
      <span className="text-sm font-medium text-[#333333] dark:text-white capitalize">{name}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(health.status)}`}>
        {statusText}
      </span>
    </div>
  );
};

export const Settings = () => {
  const [health, setHealth] = useState<HealthResponse>({});
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedSettings, setEditedSettings] = useState<Partial<SystemSettings>>({});

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingHealth(true);
    setError(null);
    try {
      const response = await fetchHealthStatus(signal);
      if (signal?.aborted) return;
      setHealth(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Unable to load health status.";
      setError(message);
    } finally {
      if (!signal?.aborted) setIsLoadingHealth(false);
    }
  }, []);

  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingSettings(true);
    setError(null);
    try {
      const response = await fetchSettings(signal);
      if (signal?.aborted) return;
      setSettings(response);
      setEditedSettings({});
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Unable to load settings.";
      setError(message);
    } finally {
      if (!signal?.aborted) setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadHealth(controller.signal);
    loadSettings(controller.signal);
    return () => controller.abort();
  }, [loadHealth, loadSettings]);

  const handleSave = async () => {
    if (!Object.keys(editedSettings).length) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateSettings(editedSettings);
      setSettings(updated);
      setEditedSettings({});
      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all settings to defaults?")) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const defaults = await resetSettings();
      setSettings(defaults);
      setEditedSettings({});
      setSuccessMessage("Settings reset to defaults!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset settings.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const healthSummary = useMemo(() => {
    const entries = Object.values(health);
    const ok = entries.filter((record) => normalizeStatus(record.status) === "ok").length;
    const error = entries.filter((record) => normalizeStatus(record.status) === "error").length;
    return { total: entries.length, ok, error };
  }, [health]);

  const getValue = (key: keyof SystemSettings) => {
    return editedSettings[key] !== undefined ? editedSettings[key] : settings?.[key];
  };

  const updateValue = (key: keyof SystemSettings, value: any) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(editedSettings).length > 0;

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#333333] dark:text-white tracking-tight">
            Admin Settings
          </h1>
          <p className="text-[#6b5f57] dark:text-slate-400 text-base">
            Configure system settings and monitor service health
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-500/10 dark:text-emerald-200">
            {successMessage}
          </div>
        )}

        {/* Health Status Section */}
        <section className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#333333] dark:text-white">System Health</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6b5f57] dark:text-slate-400">
                {healthSummary.ok}/{healthSummary.total} healthy
              </span>
              <button
                type="button"
                onClick={() => loadHealth()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#F5ECE5] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b5f57] transition-colors hover:bg-[#F5ECE5]/60 dark:border-slate-600/40 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-700"
                disabled={isLoadingHealth}
              >
                {isLoadingHealth ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#E89F88]/40 border-t-[#E89F88]" />
                ) : (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19A9 9 0 0119 5" />
                  </svg>
                )}
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(health).map(([service, record]) => (
              <HealthCard key={service} name={service} health={record} />
            ))}
          </div>
        </section>

        {/* Configuration Settings */}
        <section className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#333333] dark:text-white">Configuration</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving || isLoadingSettings}
                className="inline-flex items-center gap-2 rounded-xl border border-[#F5ECE5] px-4 py-2 text-sm font-semibold text-[#6b5f57] transition-colors hover:bg-[#F5ECE5]/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600/40 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Reset to Defaults
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSaving || isLoadingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E89F88] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] disabled:cursor-not-allowed disabled:bg-[#E89F88]/50"
              >
                {isSaving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>

          {isLoadingSettings ? (
            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-xl bg-[#F5ECE5]/70 dark:bg-slate-700/60" />
              <div className="h-12 animate-pulse rounded-xl bg-[#F5ECE5]/70 dark:bg-slate-700/60" />
              <div className="h-12 animate-pulse rounded-xl bg-[#F5ECE5]/70 dark:bg-slate-700/60" />
            </div>
          ) : settings ? (
            <div className="space-y-6">
              {/* AI Models */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">AI Models</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Chat Model
                      <Tooltip text="The AI model used for chat conversations and generating responses. Default: gpt-4o-mini" />
                    </span>
                    <input
                      type="text"
                      value={getValue("chat_model") as string}
                      onChange={(e) => updateValue("chat_model", e.target.value)}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Embedding Model
                      <Tooltip text="The AI model used to create semantic embeddings for knowledge articles and search. Default: text-embedding-3-large" />
                    </span>
                    <input
                      type="text"
                      value={getValue("embedding_model") as string}
                      onChange={(e) => updateValue("embedding_model", e.target.value)}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                </div>
              </div>

              {/* Assistant Behavior */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Assistant Behavior</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Min Turns
                      <Tooltip text="Minimum number of conversation turns before the assistant can end a chat session. Ensures thorough assistance." />
                    </span>
                    <input
                      type="number"
                      value={getValue("min_assist_turns") as number}
                      onChange={(e) => updateValue("min_assist_turns", parseInt(e.target.value))}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Max Turns
                      <Tooltip text="Maximum number of conversation turns allowed per chat session. Prevents excessively long conversations." />
                    </span>
                    <input
                      type="number"
                      value={getValue("max_assist_turns") as number}
                      onChange={(e) => updateValue("max_assist_turns", parseInt(e.target.value))}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Max History
                      <Tooltip text="Maximum number of previous messages to include in conversation context. Higher values use more memory but provide better context." />
                    </span>
                    <input
                      type="number"
                      value={getValue("max_history_messages") as number}
                      onChange={(e) => updateValue("max_history_messages", parseInt(e.target.value))}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                </div>
              </div>

              {/* Knowledge Base */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">Knowledge Base</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Auto-approve Articles
                      <Tooltip text="When enabled, new knowledge articles are automatically approved without manual review. Disable for quality control." />
                    </span>
                    <div className="flex items-center gap-3 h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 dark:border-slate-600/50 dark:bg-slate-900/40">
                      <input
                        type="checkbox"
                        checked={getValue("knowledge_auto_approve") as boolean}
                        onChange={(e) => updateValue("knowledge_auto_approve", e.target.checked)}
                        className="rounded border-[#F5ECE5] text-[#E89F88] focus:ring-[#E89F88]/40 dark:border-slate-600"
                      />
                      <span className="text-sm text-[#6b5f57] dark:text-slate-300">Enable</span>
                    </div>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Pipeline Interval (sec)
                      <Tooltip text="How often (in seconds) the system checks for new documents to process into knowledge articles. Lower values process faster but use more resources." />
                    </span>
                    <input
                      type="number"
                      value={getValue("knowledge_pipeline_interval_seconds") as number}
                      onChange={(e) => updateValue("knowledge_pipeline_interval_seconds", parseInt(e.target.value))}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                </div>
              </div>

              {/* System Intervals */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">System Intervals (seconds)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Analytics Refresh
                      <Tooltip text="How often (in seconds) to refresh analytics data and statistics. Lower values show more current data but increase database load." />
                    </span>
                    <input
                      type="number"
                      value={getValue("analytics_refresh_interval_seconds") as number}
                      onChange={(e) => updateValue("analytics_refresh_interval_seconds", parseInt(e.target.value))}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      Metrics Refresh
                      <Tooltip text="How often (in seconds) to update system metrics and performance indicators. Affects dashboard refresh rate." />
                    </span>
                    <input
                      type="number"
                      value={getValue("metrics_refresh_interval_seconds") as number}
                      onChange={(e) => updateValue("metrics_refresh_interval_seconds", parseInt(e.target.value))}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#333333] dark:text-white min-h-[20px] flex items-center">
                      GLPI Sync
                      <Tooltip text="How often (in seconds) to sync tickets and data with the GLPI ticketing system. Lower values keep data more synchronized." />
                    </span>
                    <input
                      type="number"
                      value={getValue("glpi_sync_interval_seconds") as number}
                      onChange={(e) => updateValue("glpi_sync_interval_seconds", parseInt(e.target.value))}
                      className="h-10 rounded-xl border border-[#F5ECE5] bg-white px-4 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
              No settings available
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
