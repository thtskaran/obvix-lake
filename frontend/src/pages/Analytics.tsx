import React, { useState, useEffect, useCallback } from "react";

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Skeleton Components
  const KPICardSkeleton = useCallback(() => (
    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <div className="w-12 h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl"></div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#F5ECE5] dark:bg-slate-700 rounded-full"></div>
          <div className="w-12 h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
        </div>
      </div>
      <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-2 w-3/4"></div>
      <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-1 w-1/2"></div>
      <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-1/3"></div>
    </div>
  ), []);

  const ChartSkeleton = useCallback(() => (
    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="space-y-2">
          <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-40"></div>
          <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-32"></div>
        </div>
        <div className="w-20 h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
      </div>
      <div className="h-64 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-4"></div>
      <div className="flex justify-between">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-12 h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded"></div>
        ))}
      </div>
    </div>
  ), []);

  const TableSkeleton = useCallback(() => (
    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-5 lg:p-6 border-b border-[#F5ECE5] dark:border-slate-600/30 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="space-y-2">
            <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-40"></div>
            <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-60"></div>
          </div>
          <div className="w-32 h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-[#F5ECE5] dark:border-slate-600/30">
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="text-left py-3 px-4 sm:px-6">
                  <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5ECE5] dark:divide-slate-600/20">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="py-3 px-4 sm:px-6">
                  <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-16"></div>
                </td>
                <td className="py-3 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg flex-shrink-0"></div>
                    <div className="space-y-1 min-w-0">
                      <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-24"></div>
                      <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-20"></div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 sm:px-6">
                  <div className="w-20 h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
                </td>
                <td className="py-3 px-4 sm:px-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="w-4 h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded"></div>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 sm:px-6">
                  <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-32"></div>
                </td>
                <td className="py-3 px-4 sm:px-6">
                  <div className="w-8 h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />
        
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          {/* Header Skeleton */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 sm:h-10 lg:h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded w-80 lg:w-96"></div>
              <div className="h-4 lg:h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-96 lg:w-[32rem]"></div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-40"></div>
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-36"></div>
            </div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {[...Array(4)].map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>

          {/* Charts Section Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
            <div className="xl:col-span-2">
              <ChartSkeleton />
            </div>
            <ChartSkeleton />
          </div>

          {/* Table Skeleton */}
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Customer Interaction Analytics
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg">
              Real-time insights into AI performance, customer satisfaction, and operational efficiency
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
            {/* Time Range Filter */}
            <button className="flex items-center gap-3 bg-white dark:bg-slate-800/60 backdrop-blur border border-[#F5ECE5] dark:border-slate-600/40 hover:border-[#E89F88] dark:hover:border-blue-400/50 text-[#333333] dark:text-white px-4 lg:px-6 py-3 rounded-xl font-medium transition-colors duration-200">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold text-sm lg:text-base whitespace-nowrap">Last 30 days</span>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Export Button */}
            <button className="flex items-center gap-3 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 lg:px-6 py-3 rounded-xl font-medium transition-colors duration-200">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold text-sm lg:text-base whitespace-nowrap">Export Report</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {/* Total Resolved Queries */}
          <div className="group bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg">
                  +12%
                </span>
              </div>
            </div>
            <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white mb-2">Total Resolved Queries</h3>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 dark:text-green-400 mb-1">12,453</p>
            <p className="text-sm text-[#6b5f57] dark:text-slate-400">This month</p>
          </div>

          {/* Average CSAT Score */}
          <div className="group bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span className="text-xs font-medium text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg">
                  +0.2
                </span>
              </div>
            </div>
            <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white mb-2">Average CSAT Score</h3>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">4.8<span className="text-lg text-[#6b5f57] dark:text-slate-400">/5</span></p>
            <p className="text-sm text-[#6b5f57] dark:text-slate-400">Customer satisfaction</p>
          </div>

          {/* AI Resolution Rate */}
          <div className="group bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-2 py-1 rounded-lg">
                  +5%
                </span>
              </div>
            </div>
            <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white mb-2">AI Resolution Rate</h3>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">91.3%</p>
            <p className="text-sm text-[#6b5f57] dark:text-slate-400">Autonomous resolution</p>
          </div>

          {/* Average Handling Time */}
          <div className="group bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-xs font-medium text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg">
                  -30s
                </span>
              </div>
            </div>
            <h3 className="text-base lg:text-lg font-semibold text-[#333333] dark:text-white mb-2">Avg. Resolution Time</h3>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-600 dark:text-amber-400 mb-1">5m 30s</p>
            <p className="text-sm text-[#6b5f57] dark:text-slate-400">Per query</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {/* CSAT Trend Chart */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold text-[#333333] dark:text-white">CSAT Score Trend</h2>
                <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base">Customer satisfaction over time</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-3 py-1 rounded-lg">
                  Trending Up
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="text-3xl lg:text-4xl font-bold text-[#333333] dark:text-white">4.8</p>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="text-sm font-medium">+0.2 from last month</span>
                </div>
              </div>
            </div>

            {/* Chart SVG */}
            <div className="h-48 sm:h-56 lg:h-64 w-full mb-4 overflow-hidden">
              <svg fill="none" height="100%" preserveAspectRatio="none" viewBox="0 0 500 200" width="100%" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
                {/* Grid Lines */}
                <defs>
                  <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 40" fill="none" stroke="rgba(245, 236, 229, 0.5)" strokeWidth="0.5" className="dark:stroke-slate-600/30"/>
                  </pattern>
                  <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_csat" x1="250" x2="250" y1="20" y2="180">
                    <stop stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#3B82F6" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Area Fill */}
                <path
                  d="M0 140C62.5 140 62.5 120 125 120C187.5 120 187.5 80 250 80C312.5 80 312.5 60 375 60C437.5 60 437.5 40 500 40V180H0V140Z"
                  fill="url(#paint0_linear_csat)"
                />
                
                {/* Main Line */}
                <path 
                  d="M0 140C62.5 140 62.5 120 125 120C187.5 120 187.5 80 250 80C312.5 80 312.5 60 375 60C437.5 60 437.5 40 500 40" 
                  stroke="#3B82F6" 
                  strokeLinecap="round" 
                  strokeWidth="3"
                  fill="none"
                />
                
                {/* Data Points */}
                <circle cx="0" cy="140" r="4" fill="#3B82F6" className="drop-shadow-lg" />
                <circle cx="125" cy="120" r="4" fill="#3B82F6" className="drop-shadow-lg" />
                <circle cx="250" cy="80" r="4" fill="#3B82F6" className="drop-shadow-lg" />
                <circle cx="375" cy="60" r="4" fill="#3B82F6" className="drop-shadow-lg" />
                <circle cx="500" cy="40" r="4" fill="#3B82F6" className="drop-shadow-lg" />
              </svg>
            </div>

            <div className="flex justify-between text-sm text-[#6b5f57] dark:text-slate-400 border-t border-[#F5ECE5] dark:border-slate-600/30 pt-4">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>

          {/* AI vs Human Resolution */}
          <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold text-[#333333] dark:text-white">Resolution Distribution</h2>
                <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base">AI vs Human handling</p>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#F5ECE5"
                    className="dark:stroke-slate-600"
                    strokeWidth="8"
                  />
                  {/* AI Resolution (91.3%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="8"
                    strokeDasharray="228.7 22.3"
                    strokeLinecap="round"
                    className="drop-shadow-lg"
                  />
                  {/* Human Handoff (8.7%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeDasharray="22.3 228.7"
                    strokeDashoffset="-228.7"
                    strokeLinecap="round"
                    className="drop-shadow-lg"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-[#333333] dark:text-white">91.3%</p>
                    <p className="text-xs text-[#6b5f57] dark:text-slate-400">AI Resolved</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
                  <span className="text-[#6b5f57] dark:text-slate-300 text-sm font-medium">AI Resolution</span>
                </div>
                <span className="text-[#333333] dark:text-white font-bold">91.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
                  <span className="text-[#6b5f57] dark:text-slate-300 text-sm font-medium">Human Handoff</span>
                </div>
                <span className="text-[#333333] dark:text-white font-bold">8.7%</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30">
              <div className="text-center">
                <p className="text-sm text-[#6b5f57] dark:text-slate-400 mb-1">This Month's Improvement</p>
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="font-medium">+5% AI Resolution</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Interactions Table */}
        <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 lg:p-6 border-b border-[#F5ECE5] dark:border-slate-600/30">
            <div>
              <h2 className="text-xl lg:text-2xl font-semibold text-[#333333] dark:text-white">Recent Interactions</h2>
              <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base">Latest customer service queries and resolutions</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-600/20 hover:bg-blue-200 dark:hover:bg-blue-600/30 rounded-xl transition-colors duration-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#F5ECE5] dark:border-slate-600/30">
                <tr>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Query ID</th>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Topic</th>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">CSAT</th>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5ECE5] dark:divide-slate-600/20">
                <tr className="hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                  <td className="py-3 px-4 sm:px-6 text-[#333333] dark:text-white font-medium">#12034</td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg flex-shrink-0">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#333333] dark:text-white font-medium truncate">Late Delivery</p>
                        <p className="text-xs text-[#6b5f57] dark:text-slate-400 truncate">Order #OD789456</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                        AI Resolved
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < 5 ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-[#6b5f57] dark:text-slate-300 whitespace-nowrap">2023-10-27 10:30 AM</td>
                  <td className="py-3 px-4 sm:px-6">
                    <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors duration-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                  <td className="py-3 px-4 sm:px-6 text-[#333333] dark:text-white font-medium">#12035</td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg flex-shrink-0">
                        <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#333333] dark:text-white font-medium truncate">Payment Issue</p>
                        <p className="text-xs text-[#6b5f57] dark:text-slate-400 truncate">Card declined</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                        Human Handoff
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < 2 ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-[#6b5f57] dark:text-slate-300 whitespace-nowrap">2023-10-27 10:32 AM</td>
                  <td className="py-3 px-4 sm:px-6">
                    <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors duration-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                  <td className="py-3 px-4 sm:px-6 text-[#333333] dark:text-white font-medium">#12036</td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#333333] dark:text-white font-medium truncate">Missing Item</p>
                        <p className="text-xs text-[#6b5f57] dark:text-slate-400 truncate">Burger missing from order</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                        AI Resolved
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < 4 ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-[#6b5f57] dark:text-slate-300 whitespace-nowrap">2023-10-27 10:35 AM</td>
                  <td className="py-3 px-4 sm:px-6">
                    <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors duration-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-[#F5ECE5]/30 dark:bg-slate-700/30 border-t border-[#F5ECE5] dark:border-slate-600/30 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#6b5f57] dark:text-slate-400">
                  Showing <span className="font-semibold text-[#333333] dark:text-white">1-5</span> of <span className="font-semibold text-[#333333] dark:text-white">247</span> interactions
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button className="flex items-center justify-center px-3 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-white dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                <div className="flex items-center gap-1 mx-2">
                  <button className="w-8 h-8 text-sm font-medium text-white bg-[#E89F88] dark:bg-blue-600 rounded-lg">1</button>
                  <button className="w-8 h-8 text-sm font-medium text-[#333333] dark:text-slate-300 bg-white dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">2</button>
                  <button className="w-8 h-8 text-sm font-medium text-[#333333] dark:text-slate-300 bg-white dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">3</button>
                  <span className="px-2 text-[#6b5f57] dark:text-slate-400">...</span>
                  <button className="w-8 h-8 text-sm font-medium text-[#333333] dark:text-slate-300 bg-white dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">25</button>
                </div>

                <button className="flex items-center justify-center px-3 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-white dark:bg-slate-700/50 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 rounded-lg transition-colors border border-[#F5ECE5] dark:border-slate-600/40">
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;