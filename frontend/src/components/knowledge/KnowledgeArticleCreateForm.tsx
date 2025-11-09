import { FormEvent, useEffect, useState } from "react";
import { createKnowledgeArticle } from "../../app/api/endpoints";
import type { KnowledgeArticle } from "../../types/api";

interface KnowledgeArticleCreateFormProps {
  personas: string[];
  defaultPersona?: string;
  onCreated?: (article: KnowledgeArticle) => void;
}

const defaultFormState = {
  persona: "",
  title: "",
  summary: "",
  full_text: "",
  audience: "internal",
  tags: "",
};

type CreateFormState = typeof defaultFormState;

export const KnowledgeArticleCreateForm = ({ personas, defaultPersona, onCreated }: KnowledgeArticleCreateFormProps) => {
  const [form, setForm] = useState<CreateFormState>({ ...defaultFormState });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!form.persona) {
      setForm((prev) => ({ ...prev, persona: defaultPersona ?? personas[0] ?? "" }));
    }
  }, [defaultPersona, personas, form.persona]);

  const updateField = (field: keyof CreateFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.persona) {
      setError("Please select a persona before creating an article.");
      return;
    }
    if (!form.full_text.trim()) {
      setError("Please provide the full text content for the article.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const article = await createKnowledgeArticle({
        persona: form.persona,
        title: form.title.trim() || undefined,
        summary: form.summary.trim() || undefined,
        full_text: form.full_text.trim(),
        audience: form.audience.trim() || undefined,
        tags: form.tags
          .split(/[,\n]/)
          .map((entry) => entry.trim())
          .filter(Boolean),
      });
      onCreated?.(article);
      setSuccessMessage(`Created article "${article.title ?? article.id}".`);
      setForm({ ...defaultFormState, persona: form.persona });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create article.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-[#333333] dark:text-white">Create knowledge article</h2>
        <p className="text-sm text-[#6b5f57] dark:text-slate-300">Draft new knowledge content from ticket escalations or curated responses.</p>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
            Persona
            <select
              value={form.persona}
              onChange={(event) => updateField("persona", event.target.value)}
              className="rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
            >
              <option value="" disabled>
                Select persona
              </option>
              {personas.map((persona) => (
                <option key={persona} value={persona}>
                  {persona}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
            Audience
            <input
              value={form.audience}
              onChange={(event) => updateField("audience", event.target.value)}
              className="rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
              placeholder="internal"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
          Title
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
            placeholder="Enter the article title"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
          Summary
          <textarea
            value={form.summary}
            onChange={(event) => updateField("summary", event.target.value)}
            className="h-24 rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
            placeholder="Short synopsis describing the article"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
          Full text
          <textarea
            value={form.full_text}
            onChange={(event) => updateField("full_text", event.target.value)}
            className="h-40 rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
            placeholder="Complete troubleshooting steps or response"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
          Tags (comma separated)
          <textarea
            value={form.tags}
            onChange={(event) => updateField("tags", event.target.value)}
            className="h-20 rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
            placeholder="billing, refunds, troubleshooting"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E89F88] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/40"
          >
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" /> : "Create article"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default KnowledgeArticleCreateForm;
