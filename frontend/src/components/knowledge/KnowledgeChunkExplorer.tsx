import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchKnowledgeCatalog,
  fetchKnowledgeDocumentChunks,
  KnowledgeDocumentChunksParams,
} from "../../app/api/endpoints";
import Pagination from "../common/Pagination";
import type { KnowledgeCatalogGDriveDocument, KnowledgeDocumentChunk } from "../../types/api";

interface KnowledgeChunkExplorerProps {
  personas: string[];
  defaultPersona?: string;
  defaultFileId?: string;
  onError?: (message: string) => void;
}

const ITEMS_PER_PAGE = 20;

export const KnowledgeChunkExplorer = ({ personas, defaultPersona, defaultFileId, onError }: KnowledgeChunkExplorerProps) => {
  const [selectedPersona, setSelectedPersona] = useState<string>(defaultPersona ?? personas[0] ?? "");
  const [documents, setDocuments] = useState<KnowledgeCatalogGDriveDocument[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>(defaultFileId ?? "");
  const [chunks, setChunks] = useState<KnowledgeDocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [includeEmbedding, setIncludeEmbedding] = useState<boolean>(false);
  const [initialFileSelectionApplied, setInitialFileSelectionApplied] = useState<boolean>(!defaultFileId);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (!personas.length) {
      setSelectedPersona("");
      return;
    }
    setSelectedPersona((prev) => {
      if (prev && personas.includes(prev)) {
        return prev;
      }
      if (defaultPersona && personas.includes(defaultPersona)) {
        return defaultPersona;
      }
      return personas[0];
    });
  }, [defaultPersona, personas]);

  const loadCatalog = useCallback(
    async (persona: string, signal?: AbortSignal) => {
      if (!persona) {
        setDocuments([]);
        setSelectedFileId("");
        setChunks([]);
        setTotal(0);
        return;
      }
      setIsCatalogLoading(true);
      setError(null);
      try {
        const response = await fetchKnowledgeCatalog({ personas: [persona] }, signal);
        if (signal?.aborted) {
          return;
        }
        const entry = response.personas.find((item) => item.persona === persona);
        const docs = Array.isArray(entry?.gdrive_documents) ? entry.gdrive_documents : [];
        setDocuments(docs);
        if (!docs.length) {
          setSelectedFileId("");
          setChunks([]);
          setTotal(0);
          return;
        }
        const hasDefaultFile = Boolean(defaultFileId && docs.some((doc) => doc.file_id === defaultFileId));
        const fallbackFileId = docs[0]?.file_id ?? "";
        setSelectedFileId((current) => {
          if (current && docs.some((doc) => doc.file_id === current)) {
            return current;
          }
          if (!initialFileSelectionApplied && hasDefaultFile && defaultFileId) {
            return defaultFileId;
          }
          return fallbackFileId;
        });
        if (!initialFileSelectionApplied && hasDefaultFile) {
          setInitialFileSelectionApplied(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load knowledge documents.";
        setError(message);
        onError?.(message);
        setDocuments([]);
        setSelectedFileId("");
        setChunks([]);
        setTotal(0);
      } finally {
        if (!signal?.aborted) {
          setIsCatalogLoading(false);
        }
      }
    },
    [defaultFileId, initialFileSelectionApplied, onError],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(selectedPersona, controller.signal);
    return () => controller.abort();
  }, [loadCatalog, selectedPersona]);

  const loadChunks = useCallback(
    async (fileId: string, page: number, signal?: AbortSignal) => {
      if (!selectedPersona || !fileId) {
        setChunks([]);
        setTotal(0);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * ITEMS_PER_PAGE;
        const params: KnowledgeDocumentChunksParams = {
          persona: selectedPersona,
          limit: ITEMS_PER_PAGE,
          offset: offset,
          includeEmbedding,
        };
        const response = await fetchKnowledgeDocumentChunks(fileId, params, signal);
        if (signal?.aborted) {
          return;
        }
        const chunkList = Array.isArray(response.chunks) ? response.chunks : [];
        setChunks(chunkList);
        setTotal(typeof response.total === "number" ? response.total : chunkList.length);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load chunks.";
        setError(message);
        onError?.(message);
        setChunks([]);
        setTotal(0);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [includeEmbedding, onError, selectedPersona],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (selectedPersona && selectedFileId) {
      setCurrentPage(1); // Reset to first page when file changes
      loadChunks(selectedFileId, 1, controller.signal);
    } else {
      setChunks([]);
      setTotal(0);
    }
    return () => controller.abort();
  }, [loadChunks, selectedFileId, selectedPersona]);

  useEffect(() => {
    const controller = new AbortController();
    if (selectedPersona && selectedFileId && currentPage > 1) {
      loadChunks(selectedFileId, currentPage, controller.signal);
    }
    return () => controller.abort();
  }, [currentPage, loadChunks, selectedFileId, selectedPersona]);

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.file_id === selectedFileId),
    [documents, selectedFileId],
  );

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileChange = (fileId: string) => {
    setSelectedFileId(fileId);
    setCurrentPage(1);
  };

  const handlePersonaChange = (persona: string) => {
    setSelectedPersona(persona);
    setSelectedFileId("");
    setChunks([]);
    setTotal(0);
    setCurrentPage(1);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#F5ECE5] bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-[#333333] dark:text-white">Knowledge chunk explorer</h2>
        <p className="text-sm text-[#6b5f57] dark:text-slate-300">
          Inspect document embeddings and chunk metadata for troubleshooting ingestion issues.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
          Persona
          <select
            value={selectedPersona}
            onChange={(event) => handlePersonaChange(event.target.value)}
            className="rounded-xl border border-[#F5ECE5] bg-white px-3 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white"
          >
            {personas.map((persona) => (
              <option key={persona} value={persona}>
                {persona}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
          Knowledge document
          <select
            value={selectedFileId}
            onChange={(event) => handleFileChange(event.target.value)}
            disabled={!documents.length || isCatalogLoading}
            className="rounded-xl border border-[#F5ECE5] bg-white px-3 py-2 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-white disabled:dark:bg-slate-800/40"
          >
            {!documents.length && <option value="">No documents available</option>}
            {documents.map((doc) => (
              <option key={doc.file_id} value={doc.file_id}>
                {doc.filename ?? doc.file_id} ({doc.chunk_count ?? 0} chunks)
              </option>
            ))}
          </select>
          {isCatalogLoading && <span className="text-xs font-medium text-[#E57252] dark:text-blue-200">Loading documents…</span>}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-300">
          Include embedding
          <div className="flex items-center gap-2 rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/60 px-3 py-2 dark:border-slate-600/50 dark:bg-slate-900/40">
            <input
              type="checkbox"
              checked={includeEmbedding}
              onChange={(event) => setIncludeEmbedding(event.target.checked)}
              className="rounded border-[#F5ECE5] text-[#E57252] focus:ring-[#E89F88]/40 dark:border-slate-600"
            />
            <span className="text-xs font-semibold text-[#E57252] dark:text-blue-200">Embedding vector</span>
          </div>
        </label>
      </div>

      {selectedDocument && (
        <div className="rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/60 px-4 py-3 text-xs text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
          <div className="flex flex-wrap justify-between gap-3">
            <span className="font-semibold text-[#E57252] dark:text-blue-200">{selectedDocument.filename ?? selectedDocument.file_id}</span>
            <span>{selectedDocument.chunk_count ?? 0} chunks indexed</span>
          </div>
          {selectedDocument.source && <p className="mt-1">Source: {selectedDocument.source}</p>}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {!selectedPersona ? (
        <div className="rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
          Select a persona to view document chunks.
        </div>
      ) : !documents.length ? (
        <div className="rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
          No knowledge documents found for this persona.
        </div>
      ) : isLoading && !chunks.length ? (
        <div className="rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
          Loading chunks…
        </div>
      ) : !chunks.length ? (
        <div className="rounded-2xl border border-dashed border-[#F5ECE5] bg-white/60 p-10 text-center text-sm text-[#6b5f57] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
          No chunks were returned for the selected document.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[#6b5f57] dark:text-slate-300">
            <span>
              Showing {chunks.length} of {total} chunk{total === 1 ? "" : "s"}
            </span>
            <span>Embedding {includeEmbedding ? "enabled" : "disabled"}</span>
          </div>
          <div className="space-y-3">
            {chunks.map((chunk, index) => (
              <article
                key={`${chunk.id ?? selectedFileId}-${chunk.chunk_index ?? index}`}
                className="space-y-3 rounded-2xl border border-[#F5ECE5] bg-white/80 p-4 shadow-sm transition-colors hover:border-[#E89F88] dark:border-slate-700/60 dark:bg-slate-800/60"
              >
                <header className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#6b5f57] dark:text-slate-300">
                  <span className="rounded-full bg-[#F5ECE5]/60 px-3 py-1 text-[#333333] dark:bg-slate-700/40 dark:text-white">
                    Chunk {chunk.chunk_index ?? index}
                  </span>
                  {chunk.source && (
                    <span className="rounded-full bg-[#FDF3EF]/70 px-3 py-1 text-[#E57252] dark:bg-blue-500/20 dark:text-blue-100">
                      Source {chunk.source}
                    </span>
                  )}
                </header>
                <details open className="rounded-xl border border-[#F5ECE5] bg-[#FDF3EF]/70 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/40">
                  <summary className="cursor-pointer text-sm font-semibold text-[#333333] dark:text-white">
                    Chunk content
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-[#333333] dark:text-slate-200">
{chunk.content ?? chunk.content_preview ?? "(empty chunk)"}
                  </pre>
                </details>
                {includeEmbedding && chunk.embedding && chunk.embedding.length > 0 && (
                  <details className="rounded-xl border border-[#F5ECE5] bg-white/70 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <summary className="cursor-pointer text-sm font-semibold text-[#333333] dark:text-white">
                      Embedding vector ({chunk.embedding.length} dims)
                    </summary>
                    <div className="mt-2 max-h-48 overflow-auto text-xs">
                      <code className="whitespace-pre-wrap text-[#333333] dark:text-slate-200">{chunk.embedding.join(", ")}</code>
                    </div>
                  </details>
                )}
              </article>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </div>
      )}
    </section>
  );
};

export default KnowledgeChunkExplorer;
