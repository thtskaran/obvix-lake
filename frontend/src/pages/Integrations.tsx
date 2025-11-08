// src/pages/Integrations.tsx
import { useState, useEffect } from "react";

export const Integrations: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // 2 second loading simulation

    return () => clearTimeout(timer);
  }, []);

  // Updated Skeleton Loading Component with better colors
  const SkeletonCard = () => (
    <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 lg:p-6 shadow-lg flex flex-col h-72 lg:h-80 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#E89F88]/20 dark:bg-slate-700/50 flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-4 lg:h-5 bg-[#E89F88]/15 dark:bg-slate-700/50 rounded-lg w-3/4" />
            <div className="h-3 lg:h-4 bg-[#6b5f57]/10 dark:bg-slate-700/30 rounded-lg w-1/2" />
          </div>
        </div>
        <div className="w-6 h-6 lg:w-8 lg:h-8 bg-[#6b5f57]/10 dark:bg-slate-700/30 rounded-lg flex-shrink-0" />
      </div>

      {/* Status Skeleton */}
      <div className="flex-1 mb-4 lg:mb-6">
        <div className="flex items-center gap-2 mb-2 lg:mb-3">
          <div className="w-2 h-2 bg-[#E89F88]/20 dark:bg-slate-700/50 rounded-full flex-shrink-0" />
          <div className="h-6 bg-[#E89F88]/15 dark:bg-slate-700/50 rounded-lg w-20" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[#6b5f57]/10 dark:bg-slate-700/30 rounded-lg w-full" />
          <div className="h-3 bg-[#6b5f57]/10 dark:bg-slate-700/30 rounded-lg w-2/3" />
        </div>
      </div>

      {/* Actions Skeleton */}
      <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
        <div className="flex-1 h-8 lg:h-10 bg-[#E89F88]/15 dark:bg-slate-700/50 rounded-xl" />
        <div className="w-16 lg:w-20 h-8 lg:h-10 bg-[#6b5f57]/10 dark:bg-slate-700/30 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(232,159,136,0.1),transparent)] dark:bg-[radial-gradient(circle_at_40%_30%,rgba(120,119,198,0.1),transparent)] opacity-30" />
      <div className="absolute inset-0 bg-[conic-gradient(from_45deg_at_50%_50%,rgba(232,159,136,0.05)_0deg,transparent_60deg,rgba(232,159,136,0.05)_120deg,transparent_180deg)] dark:bg-[conic-gradient(from_45deg_at_50%_50%,rgba(59,130,246,0.05)_0deg,transparent_60deg,rgba(168,85,247,0.05)_120deg,transparent_180deg)] opacity-40" />
      
      <div className="p-4 sm:p-6 lg:p-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-8 lg:mb-10">
          <div className="space-y-2">
            {loading ? (
              <>
                <div className="h-8 lg:h-10 bg-[#E89F88]/20 dark:bg-slate-700/50 rounded-lg w-80 animate-pulse" />
                <div className="h-5 lg:h-6 bg-[#6b5f57]/15 dark:bg-slate-700/30 rounded-lg w-96 animate-pulse" />
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
                  Integrations Hub
                </h1>
                <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg">
                  Manage connections to your ticketing systems, databases, and delivery partners
                </p>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3 lg:gap-4 flex-wrap">
            {loading ? (
              <>
                <div className="h-10 lg:h-12 w-64 lg:w-72 bg-[#E89F88]/20 dark:bg-slate-700/50 rounded-xl animate-pulse" />
                <div className="h-10 lg:h-12 w-36 lg:w-40 bg-[#E89F88]/15 dark:bg-slate-700/50 rounded-xl animate-pulse" />
              </>
            ) : (
              <>

                {/* Add New Integration Button */}
                <button className="flex items-center gap-2 lg:gap-3 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl text-sm lg:text-base whitespace-nowrap">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-semibold">Add Integration</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Updated Stats Section - Standalone */}
        {/* <div className="mb-6 lg:mb-8">
          {loading ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="text-center p-4 lg:p-5 rounded-2xl bg-gradient-to-br from-[#FDFBFA] to-[#F5ECE5]/60 dark:from-slate-800/50 dark:to-slate-700/30 backdrop-blur-sm border border-[#F5ECE5] dark:border-slate-600/30 shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-2xl lg:text-3xl font-bold text-[#333333] dark:text-white mb-1">8</p>
                <p className="text-sm lg:text-base text-[#6b5f57] dark:text-slate-400 font-medium">Total Integrations</p>
              </div>
              <div className="text-center p-4 lg:p-5 rounded-2xl bg-gradient-to-br from-[#FDFBFA] to-[#F5ECE5]/60 dark:from-slate-800/50 dark:to-slate-700/30 backdrop-blur-sm border border-[#F5ECE5] dark:border-slate-600/30 shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-2xl lg:text-3xl font-bold text-[#27AE60] dark:text-green-400 mb-1">6</p>
                <p className="text-sm lg:text-base text-[#6b5f57] dark:text-slate-400 font-medium">Active</p>
              </div>
              <div className="text-center p-4 lg:p-5 rounded-2xl bg-gradient-to-br from-[#FDFBFA] to-[#F5ECE5]/60 dark:from-slate-800/50 dark:to-slate-700/30 backdrop-blur-sm border border-[#F5ECE5] dark:border-slate-600/30 shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-2xl lg:text-3xl font-bold text-[#F39C12] dark:text-yellow-400 mb-1">1</p>
                <p className="text-sm lg:text-base text-[#6b5f57] dark:text-slate-400 font-medium">Pending</p>
              </div>
              <div className="text-center p-4 lg:p-5 rounded-2xl bg-gradient-to-br from-[#FDFBFA] to-[#F5ECE5]/60 dark:from-slate-800/50 dark:to-slate-700/30 backdrop-blur-sm border border-[#F5ECE5] dark:border-slate-600/30 shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-2xl lg:text-3xl font-bold text-[#E74C3C] dark:text-red-400 mb-1">1</p>
                <p className="text-sm lg:text-base text-[#6b5f57] dark:text-slate-400 font-medium">Issues</p>
              </div>
            </div>
          )}
        </div> */}

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
          {loading ? (
            // Show skeleton cards while loading
            [...Array(8)].map((_, index) => <SkeletonCard key={index} />)
          ) : (
            <>
              {/* Freshdesk - Connected */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-72 lg:h-80">
                {/* Header - Fixed Height */}
                <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-1.5 lg:p-2 shadow-lg flex-shrink-0">
                      <img
                        className="w-full h-full rounded-lg object-cover"
                        alt="Freshdesk"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBw3br8K4FNUONdi6wryUgqUe9DyDxiUF20RffN6UCqKWoauJhKrFN2FhPUf4fY7kf1LG0qDu3cRPzGsfxSgdabjT7MFgcJQVzHdGOcfGGODCC0W0J3ul2kRSV1XKTb91OmXtV7CvzorUM17rZMbJ650qtuQCJjSQ2yx5OJZXwdUetHQ65HZ5mELpq3Imtr12HwsGVZWUhFkPM7FNzs-6oj7bsNwG5ud_yeFfSXEirBQC2qVEy4TfNB_wLZIy3KnzhwFJRolKnvaw"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white truncate">Freshdesk</h3>
                      <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 truncate">Ticketing System</p>
                    </div>
                  </div>
                  <button className="p-1.5 lg:p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* Status Section - Flexible Height */}
                <div className="flex-1 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 bg-[#6A9A2E] dark:bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-[#6A9A2E] dark:text-green-300 bg-[#8CC63F]/10 dark:bg-green-500/10 px-2 py-1 rounded-lg border border-[#8CC63F]/20 dark:border-green-500/20">
                      Connected
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400">Last sync: 2 minutes ago</p>
                    <p className="text-xs lg:text-sm text-[#333333] dark:text-slate-300 font-medium">Tickets synced: 1,847</p>
                  </div>
                </div>

                {/* Actions - Fixed Height */}
                <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
                  <button className="flex-1 py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-200 hover:text-[#333333] dark:hover:text-white font-medium transition-all duration-200 border border-[#F5ECE5] dark:border-slate-600/40 text-center text-xs lg:text-sm">
                    Configure
                  </button>
                  <button className="py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#E89F88]/20 dark:bg-blue-600/20 hover:bg-[#E89F88]/30 dark:hover:bg-blue-600/30 text-[#E89F88] dark:text-blue-300 hover:text-[#D68B72] dark:hover:text-blue-200 font-medium transition-all duration-200 border border-[#E89F88]/30 dark:border-blue-500/30 text-center text-xs lg:text-sm">
                    Test
                  </button>
                </div>
              </div>

              {/* Restaurant Partner DB - Error */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#E74C3C]/30 dark:border-red-500/30 rounded-2xl p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-72 lg:h-80">
                {/* Header - Fixed Height */}
                <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#D1C7BD] to-[#8A7968] dark:from-slate-600 dark:to-slate-700 p-1.5 lg:p-2 shadow-lg border border-[#F5ECE5] dark:border-slate-500/30 flex-shrink-0">
                      <svg className="w-full h-full text-[#6b5f57] dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white truncate">Restaurant Partner DB</h3>
                      <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 truncate">Data Source</p>
                    </div>
                  </div>
                  <button className="p-1.5 lg:p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* Status Section - Flexible Height */}
                <div className="flex-1 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 bg-[#E74C3C] dark:bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-[#C0392B] dark:text-red-300 bg-[#E74C3C]/10 dark:bg-red-500/10 px-2 py-1 rounded-lg border border-[#E74C3C]/20 dark:border-red-500/20">
                      Connection Error
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm text-[#C0392B] dark:text-red-400">Invalid credentials detected</p>
                    <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400">Last attempt: 5 minutes ago</p>
                  </div>
                </div>

                {/* Actions - Fixed Height */}
                <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
                  <button className="flex-1 py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#E74C3C]/20 dark:bg-red-600/20 hover:bg-[#E74C3C]/30 dark:hover:bg-red-600/30 text-[#C0392B] dark:text-red-300 hover:text-[#A93226] dark:hover:text-red-200 font-medium transition-all duration-200 border border-[#E74C3C]/30 dark:border-red-500/30 text-center text-xs lg:text-sm">
                    Fix Connection
                  </button>
                  <button className="py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-200 hover:text-[#333333] dark:hover:text-white font-medium transition-all duration-200 border border-[#F5ECE5] dark:border-slate-600/40 text-center text-xs lg:text-sm">
                    Retry
                  </button>
                </div>
              </div>

              {/* GLPI - Connected */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-72 lg:h-80">
                {/* Header - Fixed Height */}
                <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#5A9FD4] to-[#4A8BC2] dark:from-blue-500 dark:to-blue-600 p-1.5 lg:p-2 shadow-lg flex-shrink-0">
                      <img
                        className="w-full h-full rounded-lg object-cover"
                        alt="GLPI"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjVRm29WQ181Y13kjzXbMG9QgMmujk-cgCFnf_JbKKn6Eu_ru_eVTmtI5_lysvvexUBHiIiq9lf5wpFHJFxEdBO7q8gqB30Rcx0EFgUwi7AHfA2WMy0lJbpme11ZKx0R7LTfmtgCJBTrTmV3gq7oDJ7dHIai5X-PGJSTzkCkbwa07I3eOOvQNML55yXQ-3VZPyh6qPBTRvcpRNxqD3UmGvxqHzUX7Sncgea4ncIqSwWeHBj0tStPeqWbEkAitRzp5-1qFOMKaXrw"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white truncate">GLPI</h3>
                      <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 truncate">Asset Management</p>
                    </div>
                  </div>
                  <button className="p-1.5 lg:p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* Status Section - Flexible Height */}
                <div className="flex-1 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 bg-[#6A9A2E] dark:bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-[#6A9A2E] dark:text-green-300 bg-[#8CC63F]/10 dark:bg-green-500/10 px-2 py-1 rounded-lg border border-[#8CC63F]/20 dark:border-green-500/20">
                      Active
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400">Last sync: 15 minutes ago</p>
                    <p className="text-xs lg:text-sm text-[#333333] dark:text-slate-300 font-medium">Assets tracked: 1,204</p>
                  </div>
                </div>

                {/* Actions - Fixed Height */}
                <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
                  <button className="flex-1 py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-200 hover:text-[#333333] dark:hover:text-white font-medium transition-all duration-200 border border-[#F5ECE5] dark:border-slate-600/40 text-center text-xs lg:text-sm">
                    Configure
                  </button>
                  <button className="py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#E89F88]/20 dark:bg-blue-600/20 hover:bg-[#E89F88]/30 dark:hover:bg-blue-600/30 text-[#E89F88] dark:text-blue-300 hover:text-[#D68B72] dark:hover:text-blue-200 font-medium transition-all duration-200 border border-[#E89F88]/30 dark:border-blue-500/30 text-center text-xs lg:text-sm">
                    Sync
                  </button>
                </div>
              </div>

              {/* Delivery Partner Tracking - Pending */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5A623]/30 dark:border-yellow-500/30 rounded-2xl p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-72 lg:h-80">
                {/* Header - Fixed Height */}
                <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#E67E22] dark:from-yellow-500 dark:to-orange-500 p-1.5 lg:p-2 shadow-lg flex-shrink-0">
                      <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white truncate">Delivery Tracking</h3>
                      <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 truncate">Logistics</p>
                    </div>
                  </div>
                  <button className="p-1.5 lg:p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* Status Section - Flexible Height */}
                <div className="flex-1 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 bg-[#F5A623] dark:bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-[#E67E22] dark:text-yellow-300 bg-[#F5A623]/10 dark:bg-yellow-500/10 px-2 py-1 rounded-lg border border-[#F5A623]/20 dark:border-yellow-500/20">
                      Setup Required
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm text-[#E67E22] dark:text-yellow-400">Awaiting API key confirmation</p>
                    <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400">Configuration: 75% complete</p>
                  </div>
                </div>

                {/* Actions - Fixed Height */}
                <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
                  <button className="flex-1 py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5A623]/20 dark:bg-yellow-600/20 hover:bg-[#F5A623]/30 dark:hover:bg-yellow-600/30 text-[#E67E22] dark:text-yellow-300 hover:text-[#D35400] dark:hover:text-yellow-200 font-medium transition-all duration-200 border border-[#F5A623]/30 dark:border-yellow-500/30 text-center text-xs lg:text-sm">
                    Complete Setup
                  </button>
                  <button className="py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-200 hover:text-[#333333] dark:hover:text-white font-medium transition-all duration-200 border border-[#F5ECE5] dark:border-slate-600/40 text-center text-xs lg:text-sm">
                    Skip
                  </button>
                </div>
              </div>

              {/* Slack Notifications - Connected */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-72 lg:h-80">
                {/* Header - Fixed Height */}
                <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#9B59B6] to-[#8E44AD] dark:from-purple-500 dark:to-pink-500 p-1.5 lg:p-2 shadow-lg flex-shrink-0">
                      <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 5.042 10.1a2.528 2.528 0 0 1 2.52 2.542 2.528 2.528 0 0 1-2.52 2.523H5.042zM6.292 17.27a1.99 1.99 0 0 1 1.988-1.99 1.99 1.99 0 0 1 1.989 1.99 1.99 1.99 0 0 1-1.989 1.99 1.99 1.99 0 0 1-1.988-1.99zm11.916-3.11a1.99 1.99 0 0 1 1.988-1.99 1.99 1.99 0 0 1 1.989 1.99 1.99 1.99 0 0 1-1.989 1.99 1.99 1.99 0 0 1-1.988-1.99z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white truncate">Slack</h3>
                      <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 truncate">Notifications</p>
                    </div>
                  </div>
                  <button className="p-1.5 lg:p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* Status Section - Flexible Height */}
                <div className="flex-1 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 bg-[#6A9A2E] dark:bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-[#6A9A2E] dark:text-green-300 bg-[#8CC63F]/10 dark:bg-green-500/10 px-2 py-1 rounded-lg border border-[#8CC63F]/20 dark:border-green-500/20">
                      Active
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400">Channel: #support-alerts</p>
                    <p className="text-xs lg:text-sm text-[#333333] dark:text-slate-300 font-medium">Messages sent: 143</p>
                  </div>
                </div>

                {/* Actions - Fixed Height */}
                <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
                  <button className="flex-1 py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-200 hover:text-[#333333] dark:hover:text-white font-medium transition-all duration-200 border border-[#F5ECE5] dark:border-slate-600/40 text-center text-xs lg:text-sm">
                    Configure
                  </button>
                  <button className="py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#9B59B6]/20 dark:bg-purple-600/20 hover:bg-[#9B59B6]/30 dark:hover:bg-purple-600/30 text-[#8E44AD] dark:text-purple-300 hover:text-[#7D3C98] dark:hover:text-purple-200 font-medium transition-all duration-200 border border-[#9B59B6]/30 dark:border-purple-500/30 text-center text-xs lg:text-sm">
                    Test
                  </button>
                </div>
              </div>

              {/* Microsoft Teams - Connected */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-72 lg:h-80">
                {/* Header - Fixed Height */}
                <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#5A9FD4] to-[#3F7CAC] dark:from-blue-500 dark:to-indigo-600 p-1.5 lg:p-2 shadow-lg flex-shrink-0">
                      <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.625 3.375C21.375 3.375 22 4 22 4.75v14.5c0 .75-.625 1.375-1.375 1.375h-5.5c-.75 0-1.375-.625-1.375-1.375v-3.25H9.5v3.25c0 .75-.625 1.375-1.375 1.375h-5.5C1.875 20.625 1.25 20 1.25 19.25V4.75C1.25 4 1.875 3.375 2.625 3.375h17z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white truncate">Microsoft Teams</h3>
                      <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 truncate">Communication</p>
                    </div>
                  </div>
                  <button className="p-1.5 lg:p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* Status Section - Flexible Height */}
                <div className="flex-1 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 bg-[#6A9A2E] dark:bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-[#6A9A2E] dark:text-green-300 bg-[#8CC63F]/10 dark:bg-green-500/10 px-2 py-1 rounded-lg border border-[#8CC63F]/20 dark:border-green-500/20">
                      Connected
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400">Team: Customer Support</p>
                    <p className="text-xs lg:text-sm text-[#333333] dark:text-slate-300 font-medium">Active users: 12</p>
                  </div>
                </div>

                {/* Actions - Fixed Height */}
                <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
                  <button className="flex-1 py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-200 hover:text-[#333333] dark:hover:text-white font-medium transition-all duration-200 border border-[#F5ECE5] dark:border-slate-600/40 text-center text-xs lg:text-sm">
                    Manage
                  </button>
                  <button className="py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#E89F88]/20 dark:bg-blue-600/20 hover:bg-[#E89F88]/30 dark:hover:bg-blue-600/30 text-[#E89F88] dark:text-blue-300 hover:text-[#D68B72] dark:hover:text-blue-200 font-medium transition-all duration-200 border border-[#E89F88]/30 dark:border-blue-500/30 text-center text-xs lg:text-sm">
                    Settings
                  </button>
                </div>
              </div>

              {/* Webhook Endpoint - Active */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-72 lg:h-80">
                {/* Header - Fixed Height */}
                <div className="flex items-start justify-between mb-3 lg:mb-4 h-12 lg:h-16">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#27AE60] to-[#2ECC71] dark:from-emerald-500 dark:to-teal-500 p-1.5 lg:p-2 shadow-lg flex-shrink-0">
                      <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white truncate">Webhook Endpoint</h3>
                      <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 truncate">Custom Integration</p>
                    </div>
                  </div>
                  <button className="p-1.5 lg:p-2 text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* Status Section - Flexible Height */}
                <div className="flex-1 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 bg-[#6A9A2E] dark:bg-green-500 rounded-full flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-[#6A9A2E] dark:text-green-300 bg-[#8CC63F]/10 dark:bg-green-500/10 px-2 py-1 rounded-lg border border-[#8CC63F]/20 dark:border-green-500/20">
                      Listening
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400">Endpoint: /api/webhooks/tickets</p>
                    <p className="text-xs lg:text-sm text-[#333333] dark:text-slate-300 font-medium">Requests: 2,451</p>
                  </div>
                </div>

                {/* Actions - Fixed Height */}
                <div className="flex gap-2 pt-3 lg:pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30 h-12 lg:h-16 items-center">
                  <button className="flex-1 py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-200 hover:text-[#333333] dark:hover:text-white font-medium transition-all duration-200 border border-[#F5ECE5] dark:border-slate-600/40 text-center text-xs lg:text-sm">
                    Configure
                  </button>
                  <button className="py-2 lg:py-2.5 px-2 lg:px-4 rounded-xl bg-[#27AE60]/20 dark:bg-emerald-600/20 hover:bg-[#27AE60]/30 dark:hover:bg-emerald-600/30 text-[#229954] dark:text-emerald-300 hover:text-[#1E8449] dark:hover:text-emerald-200 font-medium transition-all duration-200 border border-[#27AE60]/30 dark:border-emerald-500/30 text-center text-xs lg:text-sm">
                    Logs
                  </button>
                </div>
              </div>

              {/* Add New Integration Card */}
              <div className="bg-[#FDFBFA] dark:bg-slate-800/40 backdrop-blur-2xl border-2 border-dashed border-[#F5ECE5] dark:border-slate-600/40 hover:border-[#E89F88] dark:hover:border-slate-500/60 rounded-2xl p-4 lg:p-6 shadow-lg transition-all duration-300 cursor-pointer hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-800/60 flex flex-col h-72 lg:h-80">
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#F5ECE5]/60 dark:bg-slate-700/50 p-2 lg:p-3 mb-3 lg:mb-4 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 transition-colors flex-shrink-0">
                    <svg className="w-full h-full text-[#6b5f57] dark:text-slate-400 hover:text-[#333333] dark:hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white mb-2">Add Integration</h3>
                  <p className="text-xs lg:text-sm text-[#6b5f57] dark:text-slate-400 mb-3 lg:mb-4">Connect a new service or platform</p>
                  <button className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl bg-[#E89F88]/20 dark:bg-blue-600/20 hover:bg-[#E89F88]/30 dark:hover:bg-blue-600/30 text-[#E89F88] dark:text-blue-300 hover:text-[#D68B72] dark:hover:text-blue-200 font-medium transition-all duration-200 border border-[#E89F88]/30 dark:border-blue-500/30 text-xs lg:text-sm">
                    Browse Integrations
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>  
    </div>
  );
};

export default Integrations;
