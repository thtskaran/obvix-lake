import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  isLoading = false,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#F5ECE5] dark:border-slate-700/60 pt-4">
      <div className="text-sm text-[#6b5f57] dark:text-slate-400">
        Showing <span className="font-semibold text-[#333333] dark:text-white">{startItem}</span> to{" "}
        <span className="font-semibold text-[#333333] dark:text-white">{endItem}</span> of{" "}
        <span className="font-semibold text-[#333333] dark:text-white">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-sm font-medium text-[#6b5f57] dark:text-slate-300 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-2 text-sm text-[#6b5f57] dark:text-slate-400"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E89F88] text-white"
                    : "border border-[#F5ECE5] dark:border-slate-700/60 text-[#6b5f57] dark:text-slate-300 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#F5ECE5] dark:border-slate-700/60 text-sm font-medium text-[#6b5f57] dark:text-slate-300 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
