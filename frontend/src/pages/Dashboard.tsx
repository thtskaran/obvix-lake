import React, { useState, useEffect } from "react";

export const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Skeleton Components
  const MetricCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-24"></div>
        <div className="w-2 h-2 bg-[#F5ECE5] dark:bg-slate-700 rounded-full"></div>
      </div>
      <div className="h-8 sm:h-10 lg:h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded w-20 mb-2"></div>
      <div className="flex items-center gap-2">
        <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded w-16"></div>
        <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-20"></div>
      </div>
    </div>
  );

  const ChatItemSkeleton = () => (
    <div className="p-4 sm:p-5 lg:p-6 animate-pulse border-l-4 border-[#F5ECE5] dark:border-slate-600">
      <div className="flex items-start gap-3 lg:gap-4">
        <div className="w-3 h-3 lg:w-4 lg:h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-full flex-shrink-0 mt-0.5"></div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-24"></div>
                <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-16"></div>
              </div>
              <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-full mb-1"></div>
              <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-3/4"></div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded w-20 mb-1"></div>
              <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-12"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4 sm:p-6 lg:p-8">
          {/* Header Skeleton */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 sm:h-10 lg:h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded w-64 lg:w-80"></div>
              <div className="h-4 lg:h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-80 lg:w-96"></div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-60"></div>
            </div>
          </div>

          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {[...Array(6)].map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>

          {/* Chat Feed Skeleton */}
          <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 lg:p-6 border-b border-[#F5ECE5] dark:border-slate-600/30 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="min-w-0">
                  <div className="h-6 sm:h-8 lg:h-9 bg-[#F5ECE5] dark:bg-slate-700 rounded w-48 mb-2"></div>
                  <div className="h-4 lg:h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-80"></div>
                </div>
                <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-24 flex-shrink-0"></div>
              </div>

              {/* Filter Tabs Skeleton */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-16 flex-shrink-0"></div>
                ))}
              </div>
            </div>

            {/* Chat Items Skeleton */}
            <div className="divide-y divide-[#F5ECE5]/50 dark:divide-slate-600/20">
              {[...Array(5)].map((_, i) => (
                <ChatItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Real-time Monitoring
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg">
              Live insights from your AI customer service operations
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
            <div className="flex items-center bg-white dark:bg-slate-800/60 backdrop-blur border border-[#F5ECE5] dark:border-slate-600/40 rounded-xl p-1 w-full sm:w-auto">
              <input
                className="bg-transparent text-[#333333] dark:text-white text-sm px-2 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-500/50 flex-1 sm:flex-none sm:w-28"
                type="date"
                defaultValue="2023-10-26"
              />
              <div className="w-px h-6 bg-[#F5ECE5] dark:bg-slate-600 mx-2" />
              <input
                className="bg-transparent text-[#333333] dark:text-white text-sm px-2 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-500/50 flex-1 sm:flex-none sm:w-28"
                type="date"
                defaultValue="2023-10-27"
              />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {/* Resolution Rate */}
          <div className="group relative bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:border-[#8CC63F]/30 dark:hover:border-green-500/30 transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8CC63F]/5 dark:from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <p className="text-[#6b5f57] dark:text-slate-400 font-medium text-xs lg:text-sm uppercase tracking-wider">Resolution Rate</p>
                <div className="w-2 h-2 bg-[#8CC63F] dark:bg-green-400 rounded-full animate-pulse" />
              </div>
              <p className="text-[#333333] dark:text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">82%</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-[#6A9A2E] dark:text-green-400 text-xs lg:text-sm font-semibold bg-[#8CC63F]/10 dark:bg-green-500/10 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 lg:w-4 lg:h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  +2.1%
                </div>
                <span className="text-[#6b5f57] dark:text-slate-400 text-xs lg:text-sm">vs last week</span>
              </div>
            </div>
          </div>

          {/* Automation Rate */}
          <div className="group relative bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:border-[#5A9FD4]/30 dark:hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#5A9FD4]/5 dark:from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <p className="text-[#6b5f57] dark:text-slate-400 font-medium text-xs lg:text-sm uppercase tracking-wider">Automation Rate</p>
                <div className="w-2 h-2 bg-[#5A9FD4] dark:bg-blue-400 rounded-full animate-pulse" />
              </div>
              <p className="text-[#333333] dark:text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">95%</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-[#4A8BC2] dark:text-blue-400 text-xs lg:text-sm font-semibold bg-[#5A9FD4]/10 dark:bg-blue-500/10 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 lg:w-4 lg:h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  +1.5%
                </div>
                <span className="text-[#6b5f57] dark:text-slate-400 text-xs lg:text-sm">vs last week</span>
              </div>
            </div>
          </div>

          {/* Handle Time */}
          <div className="group relative bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:border-[#F5A623]/30 dark:hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg sm:col-span-2 xl:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5A623]/5 dark:from-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <p className="text-[#6b5f57] dark:text-slate-400 font-medium text-xs lg:text-sm uppercase tracking-wider">Avg. Handle Time</p>
                <div className="w-2 h-2 bg-[#F5A623] dark:bg-amber-400 rounded-full animate-pulse" />
              </div>
              <p className="text-[#333333] dark:text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">2.5 min</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-[#6A9A2E] dark:text-emerald-400 text-xs lg:text-sm font-semibold bg-[#8CC63F]/10 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 lg:w-4 lg:h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  -0.2 min
                </div>
                <span className="text-[#6b5f57] dark:text-slate-400 text-xs lg:text-sm">improvement</span>
              </div>
            </div>
          </div>

          {/* CSAT Score */}
          <div className="group relative bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:border-[#9B59B6]/30 dark:hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#9B59B6]/5 dark:from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <p className="text-[#6b5f57] dark:text-slate-400 font-medium text-xs lg:text-sm uppercase tracking-wider">CSAT Score</p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < 4 ? 'bg-[#F5A623] dark:bg-yellow-400' : 'bg-[#F5ECE5] dark:bg-slate-600'}`} />
                  ))}
                </div>
              </div>
              <p className="text-[#333333] dark:text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">4.8/5</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-[#8E44AD] dark:text-purple-400 text-xs lg:text-sm font-semibold bg-[#9B59B6]/10 dark:bg-purple-500/10 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 lg:w-4 lg:h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  +0.1
                </div>
                <span className="text-[#6b5f57] dark:text-slate-400 text-xs lg:text-sm">satisfaction up</span>
              </div>
            </div>
          </div>

          {/* Escalation Rate */}
          <div className="group relative bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:border-[#8CC63F]/30 dark:hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8CC63F]/5 dark:from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <p className="text-[#6b5f57] dark:text-slate-400 font-medium text-xs lg:text-sm uppercase tracking-wider">Escalation Rate</p>
                <div className="w-2 h-2 bg-[#8CC63F] dark:bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <p className="text-[#333333] dark:text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">5%</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-[#6A9A2E] dark:text-emerald-400 text-xs lg:text-sm font-semibold bg-[#8CC63F]/10 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 lg:w-4 lg:h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  -0.5%
                </div>
                <span className="text-[#6b5f57] dark:text-slate-400 text-xs lg:text-sm">fewer escalations</span>
              </div>
            </div>
          </div>

          {/* Active Chats */}
          <div className="group relative bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:border-[#E89F88]/30 dark:hover:border-orange-500/30 transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E89F88]/5 dark:from-orange-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <p className="text-[#6b5f57] dark:text-slate-400 font-medium text-xs lg:text-sm uppercase tracking-wider">Active Chats</p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#E89F88] dark:bg-orange-400 rounded-full animate-pulse" />
                  <span className="text-xs text-[#E89F88] dark:text-orange-400 font-medium">LIVE</span>
                </div>
              </div>
              <p className="text-[#333333] dark:text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">12</p>
              <div className="flex items-center gap-2">
                <span className="text-[#6b5f57] dark:text-slate-400 text-xs lg:text-sm">Active conversations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat Feed */}
        <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-4 sm:p-5 lg:p-6 border-b border-[#F5ECE5] dark:border-slate-600/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-[#333333] dark:text-white mb-2">Live Chat Feed</h2>
                <p className="text-[#6b5f57] dark:text-slate-400 text-sm sm:text-base lg:text-lg">Monitor ongoing customer conversations in real-time</p>
              </div>
              <div className="flex items-center gap-2 bg-[#F5ECE5]/50 dark:bg-slate-700/30 px-3 py-2 rounded-lg flex-shrink-0">
                <div className="w-2 h-2 bg-[#8CC63F] dark:bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-[#333333] dark:text-slate-300 font-medium">12 Active</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button className="flex-shrink-0 bg-[#E89F88] hover:bg-[#E89F88]/90 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-medium shadow-lg shadow-[#E89F88]/25 dark:shadow-blue-500/25 transition-all whitespace-nowrap">
                All <span className="ml-1 bg-[#E89F88]/30 dark:bg-blue-400/30 px-1.5 py-0.5 rounded text-xs">12</span>
              </button>
              <button className="flex-shrink-0 bg-[#F5ECE5]/50 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap">
                Agent <span className="ml-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-xs">2</span>
              </button>
              <button className="flex-shrink-0 bg-[#F5ECE5]/50 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap">
                AI <span className="ml-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-xs">8</span>
              </button>
              <button className="flex-shrink-0 bg-[#F5ECE5]/50 dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap">
                Resolved <span className="ml-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded text-xs">2</span>
              </button>
            </div>
          </div>

          {/* Chat List */}
          <div className="divide-y divide-[#F5ECE5]/50 dark:divide-slate-600/20">
            {/* High Priority Chat */}
            <div className="group p-4 sm:p-5 lg:p-6 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 cursor-pointer transition-all duration-200 border-l-4 border-red-500/50">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base lg:text-lg text-[#333333] dark:text-white group-hover:text-[#E89F88] dark:group-hover:text-blue-400 transition-colors">John Doe</p>
                        <span className="text-[#6b5f57] dark:text-slate-400 text-xs font-mono">#12345</span>
                      </div>
                      <p className="text-[#6b5f57] dark:text-slate-300 text-sm sm:text-base leading-relaxed">My order is late, I can't find the delivery guy. Can you help?</p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20 border text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                        Needs Agent
                      </div>
                      <span className="text-[#6b5f57] dark:text-slate-400 text-xs mt-1 block">2m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resolved Chat */}
            <div className="group p-4 sm:p-5 lg:p-6 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 cursor-pointer transition-all duration-200 border-l-4 border-green-500/30">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="w-3 h-3 lg:w-4 lg:h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/30 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base lg:text-lg text-[#333333] dark:text-white group-hover:text-[#E89F88] dark:group-hover:text-blue-400 transition-colors">Jane Smith</p>
                        <span className="text-[#6b5f57] dark:text-slate-400 text-xs font-mono">#12346</span>
                      </div>
                      <p className="text-[#6b5f57] dark:text-slate-300 text-sm sm:text-base leading-relaxed">Thank you for the quick help!</p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/20 border text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                        Resolved
                      </div>
                      <span className="text-[#6b5f57] dark:text-slate-400 text-xs mt-1 block">5m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Handling Chats */}
            <div className="group p-4 sm:p-5 lg:p-6 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 cursor-pointer transition-all duration-200 border-l-4 border-blue-500/30">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="w-3 h-3 lg:w-4 lg:h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/30 animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base lg:text-lg text-[#333333] dark:text-white group-hover:text-[#E89F88] dark:group-hover:text-blue-400 transition-colors">Sam Wilson</p>
                        <span className="text-[#6b5f57] dark:text-slate-400 text-xs font-mono">#12347</span>
                      </div>
                      <p className="text-[#6b5f57] dark:text-slate-300 text-sm sm:text-base leading-relaxed">I want to change my delivery address.</p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20 border text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                        AI Handling
                      </div>
                      <span className="text-[#6b5f57] dark:text-slate-400 text-xs mt-1 block">8m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group p-4 sm:p-5 lg:p-6 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 cursor-pointer transition-all duration-200 border-l-4 border-blue-500/30">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="w-3 h-3 lg:w-4 lg:h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/30 animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base lg:text-lg text-[#333333] dark:text-white group-hover:text-[#E89F88] dark:group-hover:text-blue-400 transition-colors">Emily Carter</p>
                        <span className="text-[#6b5f57] dark:text-slate-400 text-xs font-mono">#12348</span>
                      </div>
                      <p className="text-[#6b5f57] dark:text-slate-300 text-sm sm:text-base leading-relaxed">What's the status of my refund?</p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20 border text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                        AI Handling
                      </div>
                      <span className="text-[#6b5f57] dark:text-slate-400 text-xs mt-1 block">8m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* High Priority Chat 2 */}
            <div className="group p-4 sm:p-5 lg:p-6 hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 cursor-pointer transition-all duration-200 border-l-4 border-red-500/50">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base lg:text-lg text-[#333333] dark:text-white group-hover:text-[#E89F88] dark:group-hover:text-blue-400 transition-colors">Michael Brown</p>
                        <span className="text-[#6b5f57] dark:text-slate-400 text-xs font-mono">#12349</span>
                      </div>
                      <p className="text-[#6b5f57] dark:text-slate-300 text-sm sm:text-base leading-relaxed">This is unacceptable! I want to speak to a manager.</p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20 border text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                        Needs Agent
                      </div>
                      <span className="text-[#6b5f57] dark:text-slate-400 text-xs mt-1 block">12m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;