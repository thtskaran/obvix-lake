import { useState, useEffect, useCallback } from "react";

export const FAQManager = () => {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Mock data for FAQ categories and items
  const categories = [
    { id: "all", name: "All Categories", count: 47, color: "blue" },
    { id: "delivery", name: "Delivery Issues", count: 12, color: "green" },
    { id: "payment", name: "Payment Problems", count: 8, color: "purple" },
    { id: "orders", name: "Order Management", count: 15, color: "amber" },
    { id: "account", name: "Account Issues", count: 7, color: "red" },
    { id: "refunds", name: "Refunds & Returns", count: 5, color: "indigo" }
  ];

  const pendingApprovals = [
    {
      id: "pa001",
      title: "Late Delivery Compensation Process",
      category: "Delivery Issues",
      learnedFrom: "47 tickets",
      confidence: 96,
      createdBy: "AI Agent",
      timestamp: "2 hours ago",
      preview: "When a delivery is late by more than 30 minutes, automatically offer 20% discount on next order and provide real-time tracking updates...",
      status: "pending",
      ticketPattern: "Customer complaining about late food delivery, order placed 2+ hours ago"
    },
    {
      id: "pa002", 
      title: "Payment Gateway Integration Issues",
      category: "Payment Problems",
      learnedFrom: "28 tickets",
      confidence: 87,
      createdBy: "AI Agent", 
      timestamp: "4 hours ago",
      preview: "For payment failures due to gateway timeouts, guide customer to retry with alternative payment method or hold order for 15 minutes...",
      status: "pending",
      ticketPattern: "Payment failed error, card charged but order not confirmed"
    }
  ];

  const existingFAQs = [
    {
      id: "faq001",
      title: "How to track my order?",
      category: "Order Management",
      content: "You can track your order by clicking on 'Track Order' in your account dashboard or using the tracking link sent via SMS/Email.",
      confidence: 98,
      usage: 1247,
      lastUpdated: "2 days ago",
      status: "active",
      tags: ["tracking", "orders", "delivery"]
    },
    {
      id: "faq002",
      title: "Refund processing time",
      category: "Refunds & Returns", 
      content: "Refunds are typically processed within 3-5 business days. Bank transfers may take additional 2-3 days depending on your bank.",
      confidence: 94,
      usage: 892,
      lastUpdated: "1 week ago",
      status: "active",
      tags: ["refund", "processing", "timeline"]
    }
  ];

  // Skeleton Components
  const CategorySkeleton = useCallback(() => (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-[#F5ECE5]/30 dark:bg-slate-700/30 rounded-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-full"></div>
            <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-24"></div>
          </div>
          <div className="w-6 h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded"></div>
        </div>
      ))}
    </div>
  ), []);

  const FAQSkeleton = useCallback(() => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800/40 border border-[#F5ECE5] dark:border-slate-600/40 rounded-xl p-4 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-3/4"></div>
              <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-1/2"></div>
            </div>
            <div className="w-16 h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg ml-4"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-full"></div>
            <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  ), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />
        
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          {/* Header Skeleton */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 sm:h-10 lg:h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded w-64 lg:w-80"></div>
              <div className="h-4 lg:h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-96 lg:w-[32rem]"></div>
            </div>
            <div className="h-10 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-32"></div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
            {/* Left Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-4 w-32"></div>
                <CategorySkeleton />
              </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="xl:col-span-3 space-y-6">
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="h-6 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg mb-4 w-48"></div>
                <FAQSkeleton />
              </div>
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
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Header Section - Fixed height and better spacing */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
              AI-Powered FAQ Manager
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-sm lg:text-base">
              Manage knowledge base, approve AI-generated solutions, and optimize customer self-service
            </p>
          </div>
          
          {/* Fixed button height */}
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors duration-200 h-10 whitespace-nowrap"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-semibold text-sm">Create FAQ</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Reduced padding and better spacing */}
          <div className="space-y-5">
            {/* FAQ Categories */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-5 hover:shadow-lg transition-shadow duration-200">
              <h2 className="text-lg font-semibold text-[#333333] dark:text-white mb-4">FAQ Categories</h2>
              
              <div className="space-y-2">
                {categories.map((category) => {
                  const colorMap: Record<string, string> = {
                    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
                    green: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30',
                    purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
                    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
                    red: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30',
                    indigo: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                  };

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors duration-200 border text-sm ${
                        selectedCategory === category.id 
                          ? colorMap[category.color] 
                          : 'bg-[#F5ECE5]/30 dark:bg-slate-700/30 hover:bg-[#F5ECE5]/50 dark:hover:bg-slate-700/50 text-[#333333] dark:text-white border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${
                          category.color === 'blue' ? 'bg-blue-500' :
                          category.color === 'green' ? 'bg-green-500' :
                          category.color === 'purple' ? 'bg-purple-500' :
                          category.color === 'amber' ? 'bg-amber-500' :
                          category.color === 'red' ? 'bg-red-500' :
                          'bg-indigo-500'
                        }`}></div>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/50 dark:bg-slate-800/50">
                        {category.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Learning Stats - Reduced size */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-5 hover:shadow-lg transition-shadow duration-200">
              <h2 className="text-lg font-semibold text-[#333333] dark:text-white mb-4">AI Learning Stats</h2>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-[#6b5f57] dark:text-slate-300">Documents Processed</span>
                    <span className="text-xs font-semibold text-[#333333] dark:text-white">2,847</span>
                  </div>
                  <div className="w-full bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{width: '87%'}}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-[#6b5f57] dark:text-slate-300">Vector Embeddings</span>
                    <span className="text-xs font-semibold text-[#333333] dark:text-white">156K</span>
                  </div>
                  <div className="w-full bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{width: '92%'}}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-[#6b5f57] dark:text-slate-300">Learning Accuracy</span>
                    <span className="text-xs font-semibold text-[#333333] dark:text-white">94.2%</span>
                  </div>
                  <div className="w-full bg-[#F5ECE5] dark:bg-slate-700 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" style={{width: '94.2%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area - Better spacing */}
          <div className="xl:col-span-3 space-y-5">
            {/* Search Bar - Reduced height */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6b5f57] dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search FAQs, ticket patterns, or solutions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F5ECE5]/30 dark:bg-slate-700/30 border border-[#F5ECE5] dark:border-slate-600/40 rounded-lg text-[#333333] dark:text-white placeholder-[#6b5f57] dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88] dark:focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                />
              </div>
            </div>

            {/* Pending AI-Generated FAQs - Better spacing */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-5 hover:shadow-lg transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-[#333333] dark:text-white">Pending AI Approvals</h2>
                  <p className="text-[#6b5f57] dark:text-slate-400 text-sm">FAQs learned from high-volume ticket patterns</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/20 px-2 py-1 rounded-lg">
                    {pendingApprovals.length} Pending
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {pendingApprovals.map((item) => (
                  <div key={item.id} className="bg-orange-50 dark:bg-orange-500/10 border-l-4 border-orange-400 rounded-xl p-4 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors duration-200">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-[#333333] dark:text-white mb-1">{item.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-orange-600 dark:text-orange-300 bg-orange-200 dark:bg-orange-500/30 px-2 py-1 rounded">
                              {item.category}
                            </span>
                            <span className="text-[#6b5f57] dark:text-slate-400">•</span>
                            <span className="text-[#6b5f57] dark:text-slate-400">Learned from {item.learnedFrom}</span>
                            <span className="text-[#6b5f57] dark:text-slate-400">•</span>
                            <span className="text-green-600 dark:text-green-300 font-medium">{item.confidence}% confidence</span>
                          </div>
                        </div>
                        
                        {/* Fixed button heights */}
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 h-8 whitespace-nowrap">
                            Approve
                          </button>
                          <button className="px-3 py-1.5 text-xs font-medium text-[#333333] dark:text-white bg-[#F5ECE5] dark:bg-slate-700/50 hover:bg-[#E89F88]/20 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 h-8 whitespace-nowrap">
                            Edit
                          </button>
                          <button className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-lg transition-colors duration-200 h-8 whitespace-nowrap">
                            Reject
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-[#6b5f57] dark:text-slate-300 text-sm bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg leading-relaxed">
                        {item.preview}
                      </p>
                      
                      <div className="text-xs text-[#6b5f57] dark:text-slate-400">
                        <span className="font-medium">Pattern:</span> {item.ticketPattern}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Existing FAQs - Better organization */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-5 hover:shadow-lg transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-[#333333] dark:text-white">Active Knowledge Base</h2>
                  <p className="text-[#6b5f57] dark:text-slate-400 text-sm">
                    {selectedCategory === "all" ? "All categories" : categories.find(c => c.id === selectedCategory)?.name} • Vector-embedded for AI retrieval
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-lg">
                    Live
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {existingFAQs.map((faq) => (
                  <div key={faq.id} className="bg-[#F5ECE5]/30 dark:bg-slate-700/30 rounded-xl p-4 hover:bg-[#F5ECE5]/50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <h3 className="text-base font-semibold text-[#333333] dark:text-white">{faq.title}</h3>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-2 py-1 rounded">
                              {faq.category}
                            </span>
                            <span className="text-[#6b5f57] dark:text-slate-300">{faq.usage} uses</span>
                          </div>
                        </div>
                        
                        <p className="text-[#6b5f57] dark:text-slate-300 text-sm leading-relaxed">{faq.content}</p>
                        
                        <div className="flex flex-wrap items-center gap-1">
                          {faq.tags.map((tag, index) => (
                            <span key={index} className="text-xs font-medium text-[#6b5f57] dark:text-slate-400 bg-white dark:bg-slate-800/50 px-2 py-1 rounded border border-[#F5ECE5] dark:border-slate-600/40">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-[#6b5f57] dark:text-slate-400">
                          <span>Confidence: <span className="font-medium text-green-600 dark:text-green-400">{faq.confidence}%</span></span>
                          <span>•</span>
                          <span>Updated {faq.lastUpdated}</span>
                        </div>
                      </div>
                      
                      {/* Fixed action button heights */}
                      <div className="flex gap-1">
                        <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors duration-200 h-8 w-8 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors duration-200 h-8 w-8 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Knowledge Graph Status - Simplified */}
              <div className="mt-5 pt-4 border-t border-[#F5ECE5] dark:border-slate-600/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#333333] dark:text-white">Knowledge Graph</p>
                      <p className="text-xs text-[#6b5f57] dark:text-slate-400">Vector embeddings synced</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-600 dark:text-green-300">Connected</span>
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

export default FAQManager;