import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Search, RefreshCw, FileText, Edit2, Save, X } from "lucide-react";
import { fetchKnowledgeArticles, updateKnowledgeArticle } from "../../app/api/endpoints";
import Pagination from "../common/Pagination";
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

const formatDateRelative = (value?: string): string => {
  if (!value) return "Unknown";
  const now = new Date();
  const then = new Date(value);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return then.toLocaleDateString();
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

// Helper Components
interface InfoCardProps {
  label: string;
  value: string | number;
}

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-lg bg-white border border-[#F5ECE5] dark:border-slate-700/60 dark:bg-slate-900/40 p-3">
      <div className="text-xs text-[#6b5f57] dark:text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-[#333333] dark:text-white">{value}</div>
    </div>
  );
}

interface ArticleLogEntryProps {
  article: KnowledgeArticle;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (article: KnowledgeArticle) => void;
  isEditing: boolean;
  editForm: EditFormState | null;
  onEditChange: (field: keyof EditFormState, value: string) => void;
  onSave: (article: KnowledgeArticle) => void;
  onCancelEdit: () => void;
  isSaving: boolean;
}

function ArticleLogEntry({
  article,
  isExpanded,
  onToggle,
  onEdit,
  isEditing,
  editForm,
  onEditChange,
  onSave,
  onCancelEdit,
  isSaving,
}: ArticleLogEntryProps) {
  const renderFaq = (faq: KnowledgeArticleFaqEntry[] | undefined) => {
    if (!faq?.length) return null;
    return (
      <div>
        <h5 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">
          FAQ ({faq.length})
        </h5>
        <div className="space-y-3">
          {faq.map((entry, index) => (
            <div
              key={`faq-${index}`}
              className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-3"
            >
              <p className="font-semibold text-sm text-[#333333] dark:text-white">
                Q: {entry.question ?? ""}
              </p>
              <p className="text-sm text-[#6b5f57] dark:text-slate-300 mt-1">
                A: {entry.answer ?? ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOutline = (outline: KnowledgeArticleOutlineEntry[] | undefined) => {
    if (!outline?.length) return null;
    return (
      <div>
        <h5 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">
          Resolution Steps ({outline.length})
        </h5>
        <ol className="space-y-2">
          {outline.map((entry, index) => (
            <li
              key={`outline-${index}`}
              className="flex gap-3 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-3"
            >
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#E89F88]/20 dark:bg-blue-500/20 text-xs font-semibold text-[#E57252] dark:text-blue-300">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#333333] dark:text-white">
                  {entry.title ?? `Step ${index + 1}`}
                </p>
                <p className="text-sm text-[#6b5f57] dark:text-slate-300 mt-1">{entry.details}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 overflow-hidden transition-all">
      {/* Collapsed View - Log Entry Style */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-[#6b5f57] dark:text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0 text-[#6b5f57] dark:text-slate-400" />
        )}

        <FileText className="w-4 h-4 flex-shrink-0 text-[#E57252] dark:text-blue-400" />

        <div className="flex-1 flex items-center gap-3 text-sm min-w-0 flex-wrap">
          <span className="font-semibold text-[#333333] dark:text-white truncate">
            {article.title || "Untitled article"}
          </span>

          {article.auto_generated && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 flex-shrink-0">
              AUTO
            </span>
          )}

          {typeof article.approved !== "undefined" && article.approved && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 flex-shrink-0">
              APPROVED
            </span>
          )}

          <span className="text-[#6b5f57] dark:text-slate-400 truncate flex-1 min-w-0">
            {article.summary?.slice(0, 100) || "No summary"}
            {(article.summary?.length ?? 0) > 100 ? "..." : ""}
          </span>

          <span className="text-xs text-[#6b5f57] dark:text-slate-400 flex-shrink-0">
            {formatDateRelative(article.updated_at || article.published_at)}
          </span>
        </div>
      </button>

      {/* Expanded View - Full Details */}
      {isExpanded && (
        <div className="border-t border-[#F5ECE5] dark:border-slate-700/60 bg-[#FDF3EF]/30 dark:bg-slate-900/40 p-6 space-y-6">
          {/* Article Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              {isEditing && editForm ? (
                <input
                  className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 px-3 py-2 text-lg font-semibold text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
                  placeholder="Article Title"
                  value={editForm.title}
                  onChange={(e) => onEditChange("title", e.target.value)}
                />
              ) : (
                <h3 className="text-lg font-semibold text-[#333333] dark:text-white">
                  {article.title || "Untitled article"}
                </h3>
              )}
              <p className="text-sm text-[#6b5f57] dark:text-slate-400 mt-1">
                Published {formatDate(article.published_at)}
                {article.updated_at && ` • Updated ${formatDate(article.updated_at)}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap flex-shrink-0">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F5ECE5]/70 text-[#333333] dark:bg-slate-700/40 dark:text-slate-100">
                {article.persona}
              </span>
              {article.auto_generated && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                  Auto-generated
                </span>
              )}
              {typeof article.approved !== "undefined" && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                  {article.approved ? "Approved" : "Not Approved"}
                </span>
              )}
            </div>
          </div>

          {/* Summary */}
          <div>
            <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">Summary</h4>
            {isEditing && editForm ? (
              <textarea
                className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
                rows={3}
                placeholder="Article Summary"
                value={editForm.summary}
                onChange={(e) => onEditChange("summary", e.target.value)}
              />
            ) : (
              <div className="rounded-lg bg-white dark:bg-slate-800/80 border border-[#F5ECE5] dark:border-slate-700/60 p-4 text-sm text-[#333333] dark:text-slate-200">
                {article.summary || "No summary available"}
              </div>
            )}
          </div>

          {/* Full Text */}
          {(article.full_text || isEditing) && (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-2">Full Article</h4>
              {isEditing && editForm ? (
                <textarea
                  className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm font-mono text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
                  rows={8}
                  placeholder="Full article content"
                  value={editForm.full_text}
                  onChange={(e) => onEditChange("full_text", e.target.value)}
                />
              ) : (
                <div className="rounded-lg bg-white dark:bg-slate-800/80 border border-[#F5ECE5] dark:border-slate-700/60 p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap text-[#333333] dark:text-slate-200 font-sans">
                    {article.full_text}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Resolution Outline */}
          {!isEditing && article.resolution_outline && article.resolution_outline.length > 0 && (
            renderOutline(article.resolution_outline)
          )}

          {/* FAQ */}
          {!isEditing && article.faq && article.faq.length > 0 && renderFaq(article.faq)}

          {/* Metadata */}
          {!isEditing ? (
            <div>
              <h4 className="text-sm font-semibold text-[#333333] dark:text-white mb-3">Metadata</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoCard label="Audience" value={article.audience || "internal"} />
                <InfoCard label="Chunks" value={article.chunk_count ?? 0} />
                <InfoCard label="Tags" value={article.tags?.length || 0} />
                <InfoCard
                  label="Source"
                  value={article.source_ticket_id ? `Ticket #${article.source_ticket_id}` : "Manual"}
                />
              </div>
              {article.tags && article.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {article.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded text-xs bg-[#F5ECE5]/70 dark:bg-slate-700/40 text-[#6b5f57] dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            editForm && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-[#333333] dark:text-white mb-2">
                    Audience
                  </label>
                  <input
                    className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
                    value={editForm.audience}
                    onChange={(e) => onEditChange("audience", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#333333] dark:text-white mb-2">
                    Tags (comma separated)
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
                    rows={2}
                    value={editForm.tags}
                    onChange={(e) => onEditChange("tags", e.target.value)}
                  />
                </div>
              </div>
            )
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#F5ECE5] dark:border-slate-700/60">
            {isEditing ? (
              <>
                <button
                  onClick={() => onSave(article)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E89F88] text-white text-sm font-medium hover:bg-[#D68B72] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-[#6b5f57] dark:text-slate-300 text-sm font-medium hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => onEdit(article)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-[#6b5f57] dark:text-slate-300 text-sm font-medium hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Article
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const KnowledgeArticlesPanel = ({
  personas,
  defaultPersona,
  refreshToken = 0,
}: KnowledgeArticlesPanelProps) => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedArticleIds, setExpandedArticleIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [totalArticles, setTotalArticles] = useState<number>(0);

  const effectivePersona = useMemo(() => defaultPersona ?? personas[0] ?? "", [defaultPersona, personas]);

  const loadArticles = useCallback(
    async (page: number, signal?: AbortSignal) => {
      if (!effectivePersona) {
        setArticles([]);
        setTotalArticles(0);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * itemsPerPage;
        const response = await fetchKnowledgeArticles(
          {
            persona: effectivePersona,
            limit: itemsPerPage,
            offset: offset,
            includeFullText: true,
            search: searchQuery.trim() || undefined,
          },
          signal
        );
        if (signal?.aborted) {
          return;
        }
        setArticles(response.articles ?? []);
        setTotalArticles(response.total ?? 0);
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
    [effectivePersona, itemsPerPage, searchQuery]
  );

  useEffect(() => {
    const controller = new AbortController();
    setCurrentPage(1); // Reset to first page when dependencies change
    loadArticles(1, controller.signal);
    return () => controller.abort();
  }, [loadArticles, refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    loadArticles(currentPage, controller.signal);
    return () => controller.abort();
  }, [currentPage, loadArticles]);

  const toggleArticleExpansion = (articleId: string) => {
    setExpandedArticleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

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
      await updateKnowledgeArticle(article.id, {
        persona: article.persona,
        title: editForm.title.trim() || undefined,
        summary: editForm.summary.trim() || undefined,
        full_text: editForm.full_text.trim() || undefined,
        audience: editForm.audience.trim() || undefined,
        tags: normalizeTagsInput(editForm.tags),
      });
      setSuccessMessage("Article updated successfully.");
      setEditingId(null);
      setEditForm(null);
      await loadArticles(currentPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update article.";
      setError(message);
    } finally {
      setSavingId(null);
    }
  };

  const totalPages = Math.ceil(totalArticles / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedArticleIds(new Set()); // Collapse all when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[#333333] dark:text-white">
            Knowledge Article Library
          </h2>
          {effectivePersona && (
            <p className="text-sm text-[#6b5f57] dark:text-slate-300">
              Showing articles for{" "}
              <span className="font-semibold text-[#E57252] dark:text-blue-200">{effectivePersona}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5f57] dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-64 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 pl-10 pr-3 py-2 text-sm text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/30 dark:focus:ring-blue-500/40"
            />
          </div>
          <button
            onClick={() => loadArticles(currentPage)}
            className="p-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-[#6b5f57] dark:text-slate-400 hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-sm text-[#6b5f57] dark:text-slate-400">
        <span>
          Total: <span className="font-semibold text-[#333333] dark:text-white">{totalArticles}</span>
        </span>
        <span>
          Page: <span className="font-semibold text-[#333333] dark:text-white">{currentPage} of {totalPages || 1}</span>
        </span>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50/80 dark:border-red-800/60 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          {successMessage}
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-4 animate-pulse"
              >
                <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700/60 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-8 text-center">
            <p className="text-sm text-[#6b5f57] dark:text-slate-400">
              {searchQuery ? "No articles match your search." : "No articles available for this persona yet."}
            </p>
          </div>
        ) : (
          <>
            {articles.map((article) => (
              <ArticleLogEntry
                key={article.id}
                article={article}
                isExpanded={expandedArticleIds.has(article.id)}
                onToggle={() => toggleArticleExpansion(article.id)}
                onEdit={handleStartEdit}
                isEditing={editingId === article.id}
                editForm={editForm}
                onEditChange={handleEditChange}
                onSave={handleSave}
                onCancelEdit={handleCancelEdit}
                isSaving={savingId === article.id}
              />
            ))}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalArticles}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default KnowledgeArticlesPanel;
