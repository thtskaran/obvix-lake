import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchKnowledgeArticles, updateKnowledgeArticle } from "../../app/api/endpoints";
import type {
  KnowledgeArticle,
  KnowledgeArticleFaqEntry,
  KnowledgeArticleOutlineEntry,
} from "../../types/api";

interface KnowledgeArticlesPanelProps {
  personas: string[];
  defaultPersona?: string;
  refreshToken?: number;
}

interface EditFormState {
  title: string;
  summary: string;
  full_text: string;
  audience: string;
  tags: string;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const serializeTags = (tags: string[] | undefined): string => {
  if (!tags?.length) return "";
  return tags.join(", ");
};

const normalizeTagsInput = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const MAX_PREVIEW_CHARS = 420;

export const KnowledgeArticlesPanel = ({ personas, defaultPersona, refreshToken = 0 }: KnowledgeArticlesPanelProps) => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const effectivePersona = useMemo(() => defaultPersona ?? personas[0] ?? "", [defaultPersona, personas]);

  const loadArticles = useCallback(
    async (signal?: AbortSignal) => {
      if (!effectivePersona) {
        setArticles([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchKnowledgeArticles(
          {
            persona: effectivePersona,
            limit: 50,
            offset: 0,
            includeFullText: true,
          },
          signal,
        );
        if (signal?.aborted) {
          return;
        }
        setArticles(response.articles ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load knowledge articles.";
        setError(message);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [effectivePersona],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadArticles(controller.signal);
    return () => controller.abort();
  }, [loadArticles, refreshToken]);

  const handleStartEdit = (article: KnowledgeArticle) => {
    setEditingId(article.id);
    setEditForm({
      title: article.title ?? "",
      summary: article.summary ?? "",
      full_text: article.full_text ?? article.full_text_preview ?? "",
      audience: article.audience ?? "internal",
      tags: serializeTags(article.tags),
    });
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleEditChange = (field: keyof EditFormState, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async (article: KnowledgeArticle) => {
    if (!editForm) return;
    setSavingId(article.id);
    setError(null);
    try {
      await updateKnowledgeArticle(
        article.id,
        {
          persona: article.persona,
          title: editForm.title.trim() || undefined,
          summary: editForm.summary.trim() || undefined,
          full_text: editForm.full_text.trim() || undefined,
          audience: editForm.audience.trim() || undefined,
          tags: normalizeTagsInput(editForm.tags),
        },
      );
      setSuccessMessage("Article updated successfully.");
      setEditingId(null);
      setEditForm(null);
      await loadArticles();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update article.";
      setError(message);
    } finally {
      setSavingId(null);
    }
  };

  const renderFaq = (faq: KnowledgeArticleFaqEntry[] | undefined) => {
    if (!faq?.length) return null;
    return (
      <div className="space-y-2 rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#E57252] dark:text-blue-300">FAQ</p>
        <ul className="space-y-2 text-sm text-[#333333] dark:text-slate-200">
          {faq.map((entry, index) => (
            <li key={`faq-${index}`}>
              <p className="font-semibold">Q: {entry.question ?? ""}</p>
              <p className="text-sm opacity-90">A: {entry.answer ?? ""}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderOutline = (outline: KnowledgeArticleOutlineEntry[] | undefined) => {
    if (!outline?.length) return null;
    return (
      <div className="space-y-2 rounded-xl border border-[#F5ECE5] bg-white/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#E57252] dark:text-blue-300">Resolution Outline</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-[#333333] dark:text-slate-200">
          {outline.map((entry, index) => (
            <li key={`outline-${index}`}>
              <span className="font-semibold">{entry.title ?? `Step ${index + 1}`}.</span> {entry.details}
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#F5ECE5] bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-800/60">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-[#333333] dark:text-white">Knowledge article library</h2>
          {effectivePersona && (
            <p className="text-sm text-[#6b5f57] dark:text-slate-300">
              Curated answers tailored for persona <span className="font-semibold text-[#E57252] dark:text-blue-200">{effectivePersona}</span>.
            </p>
          )}
        </div>
      </div>

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

      {isLoading && !articles.length ? (
        <div className="rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
          Loading knowledge articles…
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
          No articles available for this persona yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => {
            const isEditing = editingId === article.id && editForm;
            return (
              <article
                key={article.id}
                className="flex h-full flex-col gap-4 rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm transition-colors hover:border-[#E89F88] hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/60"
              >
                <header className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    <span className="rounded-full bg-[#F5ECE5]/70 px-3 py-1 text-[#333333] dark:bg-slate-700/40 dark:text-slate-100">
                      {article.persona ?? effectivePersona ?? "persona"}
                    </span>
                    {article.auto_generated && (
                      <span className="rounded-full bg-[#E89F88]/10 px-3 py-1 text-[#E57252] dark:bg-blue-500/20 dark:text-blue-200">
                        Auto-generated
                      </span>
                    )}
                    {typeof article.approved !== "undefined" && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                        Approved: {String(article.approved)}
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-xl border border-[#F5ECE5] bg-white px-3 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                        placeholder="Title"
                        value={editForm.title}
                        onChange={(event) => handleEditChange("title", event.target.value)}
                      />
                      <textarea
                        className="h-20 w-full rounded-xl border border-[#F5ECE5] bg-white px-3 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                        placeholder="Summary"
                        value={editForm.summary}
                        onChange={(event) => handleEditChange("summary", event.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-lg font-semibold text-[#333333] dark:text-white">{article.title ?? "Untitled article"}</h2>
                      {(() => {
                        const baseText = article.summary ?? article.full_text_preview ?? "No summary provided.";
                        const truncated = baseText.slice(0, MAX_PREVIEW_CHARS);
                        const shouldTruncate = baseText.length > MAX_PREVIEW_CHARS;
                        return (
                          <p className="text-sm leading-relaxed text-[#6b5f57] dark:text-slate-300">
                            {truncated}
                            {shouldTruncate ? "…" : ""}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                </header>

                {isEditing ? (
                  <textarea
                    className="flex-1 rounded-xl border border-[#F5ECE5] bg-white px-3 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                    placeholder="Full text"
                    value={editForm.full_text}
                    onChange={(event) => handleEditChange("full_text", event.target.value)}
                  />
                ) : article.full_text ? (
                  <details className="rounded-xl border border-[#F5ECE5] bg-white/70 px-4 py-3 text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
                    <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[#333333] dark:text-white">
                      View full text
                      <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[#6b5f57] dark:text-slate-300">
{article.full_text}
                    </pre>
                  </details>
                ) : null}

                {!isEditing && renderOutline(article.resolution_outline)}
                {!isEditing && renderFaq(article.faq)}

                {isEditing && editForm && (
                  <div className="space-y-3">
                    <label className="flex flex-col gap-2 text-xs font-semibold text-[#6b5f57] dark:text-slate-300">
                      Audience
                      <input
                        className="rounded-xl border border-[#F5ECE5] bg-white px-3 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                        value={editForm.audience}
                        onChange={(event) => handleEditChange("audience", event.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold text-[#6b5f57] dark:text-slate-300">
                      Tags (comma separated)
                      <textarea
                        className="rounded-xl border border-[#F5ECE5] bg-white px-3 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
                        value={editForm.tags}
                        onChange={(event) => handleEditChange("tags", event.target.value)}
                      />
                    </label>
                  </div>
                )}

                <footer className="mt-auto flex flex-col gap-3">
                  <div className="flex flex-wrap justify-between gap-3 text-xs text-[#6b5f57] dark:text-slate-400">
                    <span>Published {formatDate(article.published_at)}</span>
                    <span>Updated {formatDate(article.updated_at)}</span>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSave(article)}
                        disabled={savingId === article.id}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E89F88] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/40"
                      >
                        {savingId === article.id ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                        ) : (
                          "Save"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center justify-center rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm font-semibold text-[#6b5f57] transition-colors hover:bg-[#F5ECE5]/60 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(article)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#F5ECE5] bg-white px-4 py-3 text-sm font-semibold text-[#6b5f57] transition-colors hover:bg-[#F5ECE5]/60 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200"
                      >
                        Edit article
                      </button>
                      {typeof article.chunk_count !== "undefined" && (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-[#F5ECE5]/60 px-3 py-2 text-xs text-[#6b5f57] dark:bg-slate-900/40 dark:text-slate-300">
                          Chunks: {article.chunk_count}
                        </div>
                      )}
                    </div>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default KnowledgeArticlesPanel;
