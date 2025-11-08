import { useEffect, useState } from "react";

export const KnowledgeBase = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const articles = [
    { id: 1, title: "AI-Suggested: Late Delivery Compensation", category: "Customer FAQs", status: "Pending", date: "2 hours ago", isAI: true },
    { id: 2, title: "How do I update my payment method?", category: "Customer FAQs", status: "Live", date: "Oct 26, 2023", isAI: false },
    { id: 3, title: "Order tracking and delivery updates", category: "Order Management", status: "Live", date: "Oct 25, 2023", isAI: false },
    { id: 4, title: "Refund policy and processing times", category: "Refunds", status: "Draft", date: "Oct 24, 2023", isAI: false },
  ];

  const handleSelectItem = (id: number) => {
    const next = new Set(selectedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItems(next);
    setSelectAll(next.size === articles.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(articles.map((article) => article.id)));
    }
    setSelectAll((prev) => !prev);
  };

  const SkeletonRow = () => (
    <div className="p-4 border-b border-[#F5ECE5] dark:border-slate-600/20 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 bg-[#F5ECE5] dark:bg-slate-700/50 rounded flex-shrink-0" />
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700/50 rounded w-3/4" />
          <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700/30 rounded w-1/2" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg" />
          <div className="w-8 h-8 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg" />
        </div>
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live":
        return "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/20";
      case "Draft":
        return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20";
      case "Pending":
        return "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20";
      default:
        return "bg-gray-50 dark:bg-slate-500/10 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background pattern (won't affect layout/scroll) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="space-y-1 lg:space-y-2">
            {isLoading ? (
              <div className="space-y-2 lg:space-y-3">
                <div className="h-8 sm:h-10 lg:h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded w-64 lg:w-80"></div>
                <div className="h-4 lg:h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-80 lg:w-96"></div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
                  Knowledge Base
                </h1>
                <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg">
                  Manage articles, FAQs, and documentation for your support team
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
            {isLoading ? (
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-60"></div>
            ) : (
              <>
                <button className="flex items-center justify-center gap-2 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-colors text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-semibold">New Article</span>
                </button>
                <button className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800/60 hover:bg-[#F5ECE5] dark:hover:bg-slate-800 text-[#333333] dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-colors text-sm sm:text-base border border-[#F5ECE5] dark:border-slate-600/40">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-semibold">Import</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Card wrapper */}
        <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          {/* Card header */}
          <div className="bg-[#F5ECE5]/30 dark:bg-slate-700/30 border-b border-[#F5ECE5] dark:border-slate-600/30 px-4 sm:px-6 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {isLoading ? (
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-5 bg-[#F5ECE5] dark:bg-slate-700/50 rounded animate-pulse"></div>
                    <div className="w-24 h-4 bg-[#F5ECE5] dark:bg-slate-700/50 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-[#E89F88] dark:text-blue-600 bg-white dark:bg-slate-700 border-[#F5ECE5] dark:border-slate-600 rounded focus:ring-[#E89F88] dark:focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm font-medium text-[#333333] dark:text-white">
                        Select All ({selectedItems.size}/{articles.length})
                      </span>
                    </label>

                    {selectedItems.size > 0 && (
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-xs font-medium text-[#E89F88] dark:text-blue-400 bg-[#E89F88]/10 dark:bg-blue-500/20 hover:bg-[#E89F88]/20 dark:hover:bg-blue-500/30 rounded-lg transition-colors">
                          Bulk Edit
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 rounded-lg transition-colors">
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Search & Filter */}
              <div className="flex items-center bg-white dark:bg-slate-800/60 backdrop-blur border border-[#F5ECE5] dark:border-slate-600/40 rounded-xl p-1 w-full sm:w-auto max-w-xs">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="bg-transparent text-[#333333] dark:text-white text-sm px-2 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-500/50 w-24 sm:w-28"
                  />
                </div>

                <div className="w-px h-6 bg-[#F5ECE5] dark:bg-slate-600 mx-2"></div>
                <select className="bg-transparent text-[#333333] dark:text-white text-sm px-2 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-500/50 w-16 sm:w-20">
                  <option>All</option>
                  <option>FAQs</option>
                  <option>Orders</option>
                  <option>Refunds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Articles */}
          <div className="divide-y divide-[#F5ECE5]/50 dark:divide-slate-600/20">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              articles.map((article, index) => (
                <div
                  key={article.id}
                  className={`p-4 sm:p-5 lg:p-6 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${selectedItems.has(article.id) ? "bg-[#E89F88]/10 dark:bg-blue-500/10" : ""} min-w-0 overflow-hidden`}
                >
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(article.id)}
                      onChange={() => handleSelectItem(article.id)}
                      className="w-4 h-4 text-[#E89F88] dark:text-blue-600 bg-white dark:bg-slate-700 border-[#F5ECE5] dark:border-slate-600 rounded focus:ring-[#E89F88] dark:focus:ring-blue-500 focus:ring-2 mt-0.5 flex-shrink-0"
                    />

                    <div
                      className={`p-2 sm:p-2.5 rounded-lg border flex-shrink-0 ${
                        article.isAI
                          ? "bg-orange-100 dark:bg-orange-500/20 border-orange-200 dark:border-orange-500/30"
                          : index === 1
                          ? "bg-green-100 dark:bg-green-500/20 border-green-200 dark:border-green-500/30"
                          : index === 2
                          ? "bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/30"
                          : "bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          article.isAI
                            ? "text-orange-600 dark:text-orange-400"
                            : index === 1
                            ? "text-green-600 dark:text-green-400"
                            : index === 2
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {article.isAI ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        ) : index === 1 ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        ) : index === 2 ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        )}
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 min-w-0 overflow-hidden">
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-[#333333] dark:text-white text-sm sm:text-base leading-tight truncate max-w-full break-words">
                              {article.title}
                            </h3>
                            {article.isAI && (
                              <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-semibold px-2 py-1 rounded-full border border-orange-200 dark:border-orange-500/30 whitespace-nowrap">
                                AI
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#6b5f57] dark:text-slate-400">
                            <span className="truncate">{article.category}</span>
                            <span>•</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(article.status)}`}>
                              {article.status}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{article.date}</span>
                          </div>
                          <div className="sm:hidden mt-1 text-xs text-[#6b5f57] dark:text-slate-400">
                            {article.date}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <button className="p-2 text-[#E89F88] dark:text-[#E89F88] hover:text-[#D68B72] dark:hover:text-[#D68B72] hover:bg-[#E89F88]/10 dark:hover:bg-[#E89F88]/10 rounded-lg transition-colors" title="View">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button className="p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors" title="More options">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="bg-[#F5ECE5]/30 dark:bg-slate-700/20 border-t border-[#F5ECE5] dark:border-slate-600/30 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0 overflow-hidden">
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <div className="w-32 sm:w-40 h-4 bg-[#F5ECE5] dark:bg-slate-700/50 rounded animate-pulse" />
                ) : (
                  <span className="text-sm text-[#6b5f57] dark:text-slate-400">
                    Showing <span className="font-semibold text-[#333333] dark:text-white">1-4</span> of <span className="font-semibold text-[#333333] dark:text-white">127</span> articles
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 justify-center sm:justify-end">
                {isLoading ? (
                  <div className="flex gap-1">
                    <div className="w-16 sm:w-20 h-8 sm:h-10 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg animate-pulse" />
                    <div className="w-8 sm:w-10 h-8 sm:h-10 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg animate-pulse" />
                    <div className="w-8 sm:w-10 h-8 sm:h-10 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg animate-pulse" />
                    <div className="w-8 sm:w-10 h-8 sm:h-10 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg animate-pulse" />
                    <div className="w-16 sm:w-20 h-8 sm:h-10 bg-[#F5ECE5] dark:bg-slate-700/50 rounded-lg animate-pulse" />
                  </div>
                ) : (
                  <>
                    <button className="flex items-center justify-center px-3 sm:px-4 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-white dark:bg-slate-800/60 hover:bg-[#F5ECE5] dark:hover:bg-slate-800 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40 disabled:opacity-50 disabled:cursor-not-allowed">
                      <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </button>

                    <div className="flex items-center gap-1 mx-2">
                      <button className="w-8 h-8 sm:w-10 sm:h-10 text-sm font-medium text-white bg-[#E89F88] dark:bg-blue-600 rounded-lg">1</button>
                      <button className="w-8 h-8 sm:w-10 sm:h-10 text-sm font-medium text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white bg-white dark:bg-slate-800/60 hover:bg-[#F5ECE5] dark:hover:bg-slate-800 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">2</button>
                      <button className="w-8 h-8 sm:w-10 sm:h-10 text-sm font-medium text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white bg-white dark:bg-slate-800/60 hover:bg-[#F5ECE5] dark:hover:bg-slate-800 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">3</button>
                      <span className="px-2 text-[#6b5f57] dark:text-slate-400 text-sm">...</span>
                      <button className="w-8 h-8 sm:w-10 sm:h-10 text-sm font-medium text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white bg-white dark:bg-slate-800/60 hover:bg-[#F5ECE5] dark:hover:bg-slate-800 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">10</button>
                    </div>

                    <button className="flex items-center justify-center px-3 sm:px-4 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-white dark:bg-slate-800/60 hover:bg-[#F5ECE5] dark:hover:bg-slate-800 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <svg className="w-4 h-4 ml-1 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
