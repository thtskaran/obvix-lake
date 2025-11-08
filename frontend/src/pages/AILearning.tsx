import React, { useState, useEffect, useMemo, useCallback } from "react";

export const AILearning: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Memoized data to prevent re-renders
  const metricsData = useMemo(() => [
    {
      id: 'learning-pipeline',
      title: 'Learning Pipeline',
      value: '127',
      description: 'New solutions learned',
      trend: '+23 this week',
      color: 'green',
      status: 'Active',
      icon: (
        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'knowledge-nodes',
      title: 'Knowledge Nodes',
      value: '2,847',
      description: 'Connected entities',
      trend: '+156 new connections',
      color: 'blue',
      status: 'Expanding',
      icon: (
        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'handoff-rate',
      title: 'Handoff Rate',
      value: '8.7%',
      description: 'Requires human agent',
      trend: '-2.3% from last month',
      color: 'amber',
      status: 'Improving',
      icon: (
        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'confidence-score',
      title: 'Confidence Score',
      value: '94.2%',
      description: 'Average prediction accuracy',
      trend: '+1.8% improvement',
      color: 'purple',
      status: 'High',
      icon: (
        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ], []);

  // Optimized Skeleton Components with will-change for better performance
  const MetricsSkeleton = useCallback(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 animate-pulse will-change-transform">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="w-12 h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F5ECE5] dark:bg-slate-700 rounded-full"></div>
              <div className="w-16 h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
            </div>
          </div>
          <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-2 w-3/4"></div>
          <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-1 w-1/2"></div>
          <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-2/3"></div>
        </div>
      ))}
    </div>
  ), []);

  const TableSkeleton = useCallback(() => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-[#F5ECE5] dark:border-slate-600/30">
          <tr>
            {[...Array(4)].map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F5ECE5] dark:divide-slate-600/20">
          {[...Array(3)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg flex-shrink-0"></div>
                  <div className="space-y-1 min-w-0">
                    <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-24"></div>
                    <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-20"></div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-48 max-w-full"></div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-[#F5ECE5] dark:bg-slate-700 rounded-full"></div>
                  <div className="w-8 h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded"></div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex gap-2">
                  <div className="w-16 h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
                  <div className="w-12 h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ), []);

  const RightColumnSkeleton = useCallback(() => (
    <div className="space-y-6 lg:space-y-8">
      {[...Array(2)].map((_, cardIndex) => (
        <div key={cardIndex} className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 animate-pulse">
          <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-4 lg:mb-6 w-40"></div>
          <div className="space-y-4 lg:space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-32"></div>
                  <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-12"></div>
                </div>
                <div className="w-full bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-[#E89F88] dark:bg-blue-500 h-2 rounded-full w-3/4"></div>
                </div>
                <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mt-1 w-3/5"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ), []);

  // Memoized metric card component
  const MetricCard = useCallback(({ metric }) => {
    const getColorClasses = (color) => {
      const colorMap = {
        green: {
          bg: 'bg-green-100 dark:bg-green-500/20',
          text: 'text-green-600 dark:text-green-400',
          dot: 'bg-green-500',
          badge: 'text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/20',
          trend: 'text-green-600 dark:text-green-300'
        },
        blue: {
          bg: 'bg-blue-100 dark:bg-blue-500/20',
          text: 'text-blue-600 dark:text-blue-400',
          dot: 'bg-blue-500',
          badge: 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20',
          trend: 'text-blue-600 dark:text-blue-300'
        },
        amber: {
          bg: 'bg-amber-100 dark:bg-amber-500/20',
          text: 'text-amber-600 dark:text-amber-400',
          dot: 'bg-amber-500',
          badge: 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20',
          trend: 'text-green-600 dark:text-green-300'
        },
        purple: {
          bg: 'bg-purple-100 dark:bg-purple-500/20',
          text: 'text-purple-600 dark:text-purple-400',
          dot: 'bg-purple-500',
          badge: 'text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20',
          trend: 'text-green-600 dark:text-green-300'
        }
      };
      return colorMap[color];
    };

    const colors = getColorClasses(metric.color);

    return (
      <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200 will-change-transform">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div className={`p-3 ${colors.bg} rounded-xl`}>
            {metric.icon}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${colors.dot} rounded-full ${metric.status === 'Active' || metric.status === 'Expanding' ? 'animate-pulse' : ''}`}></div>
            <span className={`text-xs font-medium ${colors.badge} px-2 py-1 rounded-lg`}>
              {metric.status}
            </span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[#333333] dark:text-white mb-2">{metric.title}</h3>
        <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${colors.text} mb-1`}>{metric.value}</p>
        <p className="text-sm text-[#6b5f57] dark:text-slate-400">{metric.description}</p>
        <div className={`mt-3 text-xs ${colors.trend}`}>{metric.trend}</div>
      </div>
    );
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />
        
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          {/* Header Skeleton */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 sm:h-10 lg:h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded w-64 lg:w-80"></div>
              <div className="h-4 lg:h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-80 lg:w-96"></div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-40"></div>
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-32"></div>
            </div>
          </div>

          {/* Metrics Skeleton */}
          <MetricsSkeleton />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Left Column Skeleton */}
            <div className="xl:col-span-2 space-y-6 lg:space-y-8">
              {/* High-Volume Issues Skeleton */}
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 animate-pulse">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
                  <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-48 lg:w-64"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#F5ECE5] dark:bg-slate-700 rounded-full"></div>
                    <div className="w-32 h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-[#F5ECE5]/30 dark:bg-slate-700/20">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg flex-shrink-0"></div>
                        <div className="space-y-1 min-w-0">
                          <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-32 sm:w-40"></div>
                          <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-28 sm:w-32"></div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right space-y-1 flex-shrink-0">
                        <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-16 sm:w-20"></div>
                        <div className="w-16 sm:w-20 h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solutions Table Skeleton */}
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
                  <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-60 lg:w-80"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#F5ECE5] dark:bg-slate-700 rounded-full"></div>
                    <div className="w-28 h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg"></div>
                  </div>
                </div>
                <TableSkeleton />
              </div>
            </div>

            {/* Right Column Skeleton */}
            <RightColumnSkeleton />
          </div>
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
              AI Learning & Performance
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg">
              Monitor AI training, approve new solutions, and optimize performance metrics
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

            {/* Training Actions */}
            <button className="flex items-center gap-3 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 lg:px-6 py-3 rounded-xl font-medium transition-colors duration-200">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-semibold text-sm lg:text-base whitespace-nowrap">Train Model</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {metricsData.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {/* Left Column - Learning Activities */}
          <div className="xl:col-span-2 space-y-6 lg:space-y-8">
            {/* High-Volume Issue Clusters */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-semibold text-[#333333] dark:text-white">High-Volume Issue Detection</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded-lg">
                    Learning Opportunity
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500/40 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors duration-200">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#333333] dark:text-white">Late Delivery Complaints</p>
                      <p className="text-sm text-[#6b5f57] dark:text-slate-400">Spike detected: +180% in last 48h</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">324 tickets</p>
                    <button className="mt-1 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-lg transition-colors duration-200">
                      Start Learning
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-[#F5ECE5]/30 dark:bg-slate-700/20 hover:bg-[#F5ECE5]/50 dark:hover:bg-slate-700/30 transition-colors duration-200">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#333333] dark:text-white">Restaurant Menu Issues</p>
                      <p className="text-sm text-[#6b5f57] dark:text-slate-400">Consistent pattern identified</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">89 tickets</p>
                    <button className="mt-1 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 rounded-lg transition-colors duration-200">
                      Analyze Pattern
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-[#F5ECE5]/30 dark:bg-slate-700/20 hover:bg-[#F5ECE5]/50 dark:hover:bg-slate-700/30 transition-colors duration-200">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#333333] dark:text-white">Payment Processing Errors</p>
                      <p className="text-sm text-[#6b5f57] dark:text-slate-400">New integration causing issues</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">156 tickets</p>
                    <button className="mt-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 rounded-lg transition-colors duration-200">
                      Review Solutions
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Solution Approvals */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-semibold text-[#333333] dark:text-white">AI-Generated Solutions Awaiting Approval</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#E89F88] dark:bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-[#E89F88] dark:text-orange-300 bg-orange-100 dark:bg-orange-500/20 px-2 py-1 rounded-lg">
                    3 Pending Review
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#F5ECE5] dark:border-slate-600/30">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Issue Category</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">AI Solution</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Confidence</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#6b5f57] dark:text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5ECE5] dark:divide-slate-600/20">
                    <tr className="hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/30 transition-colors duration-200 bg-orange-50 dark:bg-orange-500/10 border-l-4 border-[#E89F88]/40 dark:border-orange-500/40">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex-shrink-0">
                            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#333333] dark:text-white font-medium">Late Delivery</p>
                            <p className="text-xs text-[#6b5f57] dark:text-slate-400">Learned from 47 tickets</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#6b5f57] dark:text-slate-300">
                        <p className="line-clamp-2 max-w-xs">"Apologize, provide real-time tracking, offer 20% discount for next order"</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{width: '96%'}}></div>
                          </div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-300">96%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200">
                            Approve
                          </button>
                          <button className="px-3 py-1.5 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700/50 hover:bg-[#E89F88]/20 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/20 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#333333] dark:text-white font-medium">Wrong Order</p>
                            <p className="text-xs text-[#6b5f57] dark:text-slate-400">Learned from 32 tickets</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#6b5f57] dark:text-slate-300">
                        <p className="line-clamp-2 max-w-xs">"Process immediate reorder with correct items, full refund for wrong items"</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{width: '91%'}}></div>
                          </div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-300">91%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200">
                            Approve
                          </button>
                          <button className="px-3 py-1.5 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700/50 hover:bg-[#E89F88]/20 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/20 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex-shrink-0">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#333333] dark:text-white font-medium">Payment Failed</p>
                            <p className="text-xs text-[#6b5f57] dark:text-slate-400">Learned from 28 tickets</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#6b5f57] dark:text-slate-300">
                        <p className="line-clamp-2 max-w-xs">"Guide to update payment method, hold order for 15 minutes, provide alternative payment options"</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{width: '87%'}}></div>
                          </div>
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-300">87%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200">
                            Approve
                          </button>
                          <button className="px-3 py-1.5 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700/50 hover:bg-[#E89F88]/20 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Performance Metrics */}
          <div className="space-y-6 lg:space-y-8">
            {/* Model Performance */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#333333] dark:text-white mb-4 lg:mb-6">Model Performance</h2>

              <div className="space-y-4 lg:space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[#6b5f57] dark:text-slate-300 font-medium text-sm lg:text-base">BERT Sentiment Analysis</p>
                    <span className="text-green-600 dark:text-green-400 font-bold">98.3%</span>
                  </div>
                  <div className="w-full bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{width: '98.3%'}}></div>
                  </div>
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400 mt-1">Emotion classification accuracy</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[#6b5f57] dark:text-slate-300 font-medium text-sm lg:text-base">Random Forest Classifier</p>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">94.7%</span>
                  </div>
                  <div className="w-full bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{width: '94.7%'}}></div>
                  </div>
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400 mt-1">Intent classification accuracy</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[#6b5f57] dark:text-slate-300 font-medium text-sm lg:text-base">Vector Similarity</p>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">91.2%</span>
                  </div>
                  <div className="w-full bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{width: '91.2%'}}></div>
                  </div>
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400 mt-1">Document retrieval relevance</p>
                </div>

                <div className="pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30">
                  <div className="flex items-center justify-between">
                    <p className="text-[#6b5f57] dark:text-slate-300 font-medium text-sm lg:text-base">Overall System Health</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 dark:text-green-300 font-medium">Excellent</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400 mt-1">All models performing within expected parameters</p>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow duration-200">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#333333] dark:text-white mb-4 lg:mb-6">Recent Learning Activities</h2>

              <div className="space-y-4">
                {[
                  {
                    icon: (
                      <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ),
                    title: 'Solution approved',
                    description: 'Late delivery compensation workflow',
                    time: '2 minutes ago',
                    color: 'green'
                  },
                  {
                    icon: (
                      <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    ),
                    title: 'New pattern detected',
                    description: 'Payment gateway integration issues',
                    time: '15 minutes ago',
                    color: 'blue'
                  },
                  {
                    icon: (
                      <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    ),
                    title: 'Knowledge graph updated',
                    description: '56 new entity relationships mapped',
                    time: '32 minutes ago',
                    color: 'purple'
                  },
                  {
                    icon: (
                      <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ),
                    title: 'Model retrained',
                    description: 'Sentiment analysis accuracy improved to 98.3%',
                    time: '1 hour ago',
                    color: 'amber'
                  }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-[#F5ECE5]/30 dark:bg-slate-700/30 hover:bg-[#F5ECE5]/50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <div className={`p-1.5 bg-${activity.color}-100 dark:bg-${activity.color}-500/20 rounded-lg flex-shrink-0 mt-0.5`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#333333] dark:text-white font-medium">{activity.title}</p>
                      <p className="text-xs text-[#6b5f57] dark:text-slate-400 truncate">{activity.description}</p>
                      <p className="text-xs text-[#999999] dark:text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILearning;