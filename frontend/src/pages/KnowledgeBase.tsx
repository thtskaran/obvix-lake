import { useCallback, useState } from "react";
import KnowledgeArticleCreateForm from "../components/knowledge/KnowledgeArticleCreateForm";
import KnowledgeArticlesPanel from "../components/knowledge/KnowledgeArticlesPanel";
import KnowledgeChunkExplorer from "../components/knowledge/KnowledgeChunkExplorer";
import { usePersonas } from "../hooks/usePersonas";
import type { KnowledgeArticle } from "../types/api";

export const KnowledgeBase = () => {
  const [articlesRefreshToken, setArticlesRefreshToken] = useState<number>(0);
  const { personas } = usePersonas();

  const defaultKnowledgePersona = personas[0] || "";

  const handleArticleCreated = useCallback(
    (_article: KnowledgeArticle) => {
      setArticlesRefreshToken((prev) => prev + 1);
    },
    [],
  );

  const hasPersonas = personas.length > 0;
  const knowledgePanelKey = defaultKnowledgePersona ? `panel-${defaultKnowledgePersona}` : "panel-all";
  const chunkExplorerKey = defaultKnowledgePersona ? `chunks-${defaultKnowledgePersona}` : "chunks-all";

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#333333] dark:text-white tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base max-w-2xl">
            Manage knowledge articles and explore document chunks
          </p>
        </header>

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
