import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { fetchHealthStatus } from '../app/api/analytics';
import type { HealthResponse } from '../types/api';

interface SystemSettings {
  chatModel: string;
  embeddingModel: string;
  ragJudgeModel: string;
  llmTempLow: number;
  maxEmbedChars: number;
  minAssistTurns: number;
  maxAssistTurns: number;
  maxHistoryMessages: number;
  knowledgePipelineIntervalSeconds: number;
  analyticsRefreshIntervalSeconds: number;
}

export function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    chatModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    ragJudgeModel: 'gpt-4o-mini',
    llmTempLow: 0.2,
    maxEmbedChars: 150000,
    minAssistTurns: 2,
    maxAssistTurns: 10,
    maxHistoryMessages: 20,
    knowledgePipelineIntervalSeconds: 3600,
    analyticsRefreshIntervalSeconds: 600,
  });

  const [healthStatus, setHealthStatus] = useState<'ok' | 'warning' | 'error'>('ok');
  const [healthCount, setHealthCount] = useState({ ok: 0, issues: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response: HealthResponse = await fetchHealthStatus();
        const data = response.data || {};
        let ok = 0, issues = 0;
        for (const service in data) {
          const status = data[service].status.toLowerCase();
          if (status === 'ok') ok++;
          else issues++;
        }
        setHealthCount({ ok, issues });
        if (issues > 0) setHealthStatus('error');
        else if (ok === 0) setHealthStatus('warning');
        else setHealthStatus('ok');
      } catch (err) {
        setHealthStatus('error');
      }
    };
    loadHealth();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      // TODO: Replace with actual API call to /api/settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: keyof SystemSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-[#333333] dark:text-white">
            <SettingsIcon className="mr-1 inline-block h-6 w-6 align-text-bottom text-[#E89F88]" /> Admin Settings
          </h1>
          <p className="mt-1 text-sm text-[#6b5f57] dark:text-slate-400">
            Configure system parameters and monitor health
          </p>
        </header>

        {/* Compact Health Status */}
        <div className="rounded-xl border border-[#F5ECE5] bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {healthStatus === 'ok' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {healthStatus === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600" />}
              {healthStatus === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
              <div>
                <p className="text-sm font-medium text-[#333333] dark:text-white">System Health</p>
                <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                  {healthCount.ok} healthy, {healthCount.issues} issue{healthCount.issues !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <span
              className={'rounded-full px-3 py-1 text-xs font-medium ' + (
                healthStatus === 'ok'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
                  : healthStatus === 'warning'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-100'
              )}
            >
              {healthStatus === 'ok' ? 'All Systems Operational' : healthStatus === 'warning' ? 'Check Required' : 'Issues Detected'}
            </span>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="space-y-6">
          {/* AI Models Section */}
          <div className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
            <h2 className="mb-4 text-lg font-semibold text-[#333333] dark:text-white">AI Models</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Chat Model
                </label>
                <input
                  type="text"
                  value={settings.chatModel}
                  onChange={(e) => handleChange('chatModel', e.target.value)}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Embedding Model
                </label>
                <input
                  type="text"
                  value={settings.embeddingModel}
                  onChange={(e) => handleChange('embeddingModel', e.target.value)}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  RAG Judge Model
                </label>
                <input
                  type="text"
                  value={settings.ragJudgeModel}
                  onChange={(e) => handleChange('ragJudgeModel', e.target.value)}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  LLM Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.llmTempLow}
                  onChange={(e) => handleChange('llmTempLow', parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Assistant Behavior Section */}
          <div className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
            <h2 className="mb-4 text-lg font-semibold text-[#333333] dark:text-white">Assistant Behavior</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Min Assist Turns
                </label>
                <input
                  type="number"
                  value={settings.minAssistTurns}
                  onChange={(e) => handleChange('minAssistTurns', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Max Assist Turns
                </label>
                <input
                  type="number"
                  value={settings.maxAssistTurns}
                  onChange={(e) => handleChange('maxAssistTurns', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Max History Messages
                </label>
                <input
                  type="number"
                  value={settings.maxHistoryMessages}
                  onChange={(e) => handleChange('maxHistoryMessages', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Processing Section */}
          <div className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
            <h2 className="mb-4 text-lg font-semibold text-[#333333] dark:text-white">Processing</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Max Embed Characters
                </label>
                <input
                  type="number"
                  value={settings.maxEmbedChars}
                  onChange={(e) => handleChange('maxEmbedChars', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Knowledge Pipeline Interval (seconds)
                </label>
                <input
                  type="number"
                  value={settings.knowledgePipelineIntervalSeconds}
                  onChange={(e) => handleChange('knowledgePipelineIntervalSeconds', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#333333] dark:text-white">
                  Analytics Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  value={settings.analyticsRefreshIntervalSeconds}
                  onChange={(e) => handleChange('analyticsRefreshIntervalSeconds', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#F5ECE5] bg-[#FDFBFA] px-4 py-2 text-sm text-[#333333] focus:border-[#E89F88] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between rounded-xl border border-[#F5ECE5] bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/60">
          {saveMessage && (
            <div
              className={'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ' + (
                saveMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
                  : 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-100'
              )}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {saveMessage.text}
            </div>
          )}
          {!saveMessage && <div />}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E89F88] to-[#d97a5f] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
