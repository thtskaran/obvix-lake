import React, { useState, useEffect } from "react";

interface Ticket {
  id: string;
  title: string;
  customer: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Closed' | 'New' | 'Pending';
  category: string;
  timeAgo: string;
  assignedTo?: string;
  email: string;
  phone: string;
  orderId: string;
  restaurant: string;
  messages: Array<{
    sender: string;
    message: string;
    time: string;
    isAgent?: boolean;
  }>;
}

const mockTickets: Ticket[] = [
  {
    id: '#789123',
    title: 'Refund Request',
    customer: 'Olivia Martinez',
    description: 'Order was cold and spilled',
    priority: 'High',
    status: 'Closed',
    category: 'Refund Request',
    timeAgo: '2m ago',
    assignedTo: 'John Doe',
    email: 'olivia.m@email.com',
    phone: '(555) 123-4567',
    orderId: '#ORD54321',
    restaurant: 'The Burger Joint',
    messages: [
      {
        sender: 'Olivia Martinez',
        message: "My order was cold and the drink was spilled all over the bag. I'd like a full refund for this order.",
        time: '2 minutes ago',
        isAgent: false
      },
      {
        sender: 'John Doe (Agent)',
        message: "Hi Olivia, I'm so sorry to hear about your experience. I've processed a full refund for your order. It should reflect in your account within 3-5 business days.",
        time: 'Just now',
        isAgent: true
      }
    ]
  },
  {
    id: '#789122',
    title: 'Missing Item',
    customer: 'Benjamin Carter',
    description: 'Fries from combo meal',
    priority: 'Medium',
    status: 'New',
    category: 'Missing Item',
    timeAgo: '15m ago',
    email: 'ben.carter@email.com',
    phone: '(555) 987-6543',
    orderId: '#ORD54322',
    restaurant: 'Pizza Palace',
    messages: [
      {
        sender: 'Benjamin Carter',
        message: "I am missing the fries from my combo meal. Can you help me with this?",
        time: '15 minutes ago',
        isAgent: false
      }
    ]
  },
  {
    id: '#789121',
    title: 'Order Delay',
    customer: 'Sophia Williams',
    description: '30 minutes late',
    priority: 'Low',
    status: 'Pending',
    category: 'Order Delay',
    timeAgo: '1h ago',
    assignedTo: 'Sarah Wilson',
    email: 'sophia.w@email.com',
    phone: '(555) 456-7890',
    orderId: '#ORD54323',
    restaurant: 'Taco Town',
    messages: [
      {
        sender: 'Sophia Williams',
        message: "My order is 30 minutes late, can I get an update on when it will arrive?",
        time: '1 hour ago',
        isAgent: false
      },
      {
        sender: 'Sarah Wilson (Agent)',
        message: "Hi Sophia, I'm checking with the restaurant now. Your order should be out for delivery within the next 10 minutes.",
        time: '45 minutes ago',
        isAgent: true
      }
    ]
  }
];

export const Tickets: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null); // Changed to null
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowMobileChat(true); // Show chat on mobile when ticket is selected
  };

  const handleDesktopTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    // Don't show mobile chat for desktop
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Add message logic here
      setNewMessage('');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300';
      case 'Low': return 'bg-gray-100 text-gray-800 dark:bg-slate-500/20 dark:text-slate-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-slate-500/20 dark:text-slate-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed': return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300';
      case 'New': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300';
      case 'Open': return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-slate-500/20 dark:text-slate-300';
    }
  };

  // Skeleton components (keeping existing ones)
  const MobileTicketSkeleton = () => (
    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-6 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-16"></div>
            <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-12"></div>
          </div>
          <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-24 mb-1"></div>
          <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-48"></div>
        </div>
        <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-10"></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-16"></div>
        <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-20"></div>
      </div>
    </div>
  );

  const DesktopTicketSkeleton = () => (
    <div className="p-6 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-20"></div>
            <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-24"></div>
          </div>
          <div className="h-4 bg-[#F5ECE5] dark:bg-slate-700 rounded w-32 mb-1"></div>
          <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-64"></div>
        </div>
        
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-16"></div>
          <div className="flex items-center gap-2">
            <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-12"></div>
            <div className="h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-12"></div>
          </div>
        </div>
      </div>
      <div className="h-3 bg-[#F5ECE5] dark:bg-slate-700 rounded w-28"></div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.03),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.1),transparent)] opacity-50" />
        
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 sm:h-10 lg:h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded w-64 lg:w-80"></div>
              <div className="h-4 lg:h-5 bg-[#F5ECE5] dark:bg-slate-700 rounded w-80 lg:w-96"></div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-full sm:w-60"></div>
            </div>
          </div>

          <div className="lg:hidden space-y-6">
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-6 animate-pulse">
              <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl mb-4"></div>
              <div className="flex flex-wrap gap-2">
                <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-12"></div>
                <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-14"></div>
                <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-16"></div>
                <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-lg w-20"></div>
              </div>
            </div>

            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <MobileTicketSkeleton key={i} />
              ))}
            </div>
          </div>

          <div className="hidden lg:flex gap-8 h-[calc(100vh-200px)]">
            <div className="w-2/5 flex flex-col">
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-6 mb-6 animate-pulse">
                <div className="h-12 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl mb-4"></div>
                <div className="flex flex-wrap gap-3">
                  <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-20"></div>
                  <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-14"></div>
                  <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-16"></div>
                  <div className="h-8 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl w-24"></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden flex-1">
                <div className="divide-y divide-[#F5ECE5]/50 dark:divide-slate-600/20 h-full overflow-y-auto">
                  {[...Array(6)].map((_, i) => (
                    <DesktopTicketSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden shadow-lg flex-1">
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#6b5f57] dark:text-slate-400">Select a ticket to view details</p>
                </div>
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
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
              Support Tickets
            </h1>
            <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg">
              Manage and respond to customer support requests
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

        {/* Mobile/Tablet Layout */}
        <div className="lg:hidden space-y-6">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-6">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-[#6b5f57] dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                className="w-full pl-12 pr-4 py-3 bg-[#F5ECE5]/30 dark:bg-slate-700/30 border border-[#F5ECE5] dark:border-slate-600/40 rounded-xl text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-400/50"
                placeholder="Search tickets..."
                type="text"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 text-sm bg-[#E89F88] text-white rounded-lg font-medium">All</button>
              <button className="px-3 py-2 text-sm bg-[#F5ECE5] dark:bg-slate-700 text-[#6b5f57] dark:text-slate-300 rounded-lg">Open</button>
              <button className="px-3 py-2 text-sm bg-[#F5ECE5] dark:bg-slate-700 text-[#6b5f57] dark:text-slate-300 rounded-lg">Closed</button>
              <button className="px-3 py-2 text-sm bg-[#F5ECE5] dark:bg-slate-700 text-[#6b5f57] dark:text-slate-300 rounded-lg">High Priority</button>
            </div>
          </div>

          {/* Tickets List - Mobile */}
          <div className="space-y-4">
            {mockTickets.map((ticket) => (
              <div key={ticket.id} className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-4 sm:p-6 border-l-4 border-l-[#E89F88] dark:border-l-blue-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#333333] dark:text-white">{ticket.id}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                    </div>
                    <p className="text-sm text-[#6b5f57] dark:text-slate-400 mb-1">{ticket.customer}</p>
                    <p className="text-sm text-[#333333] dark:text-slate-200">{ticket.category} - {ticket.description}</p>
                  </div>
                  <span className="text-xs text-[#6b5f57] dark:text-slate-400">{ticket.timeAgo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                  <button 
                    onClick={() => handleTicketSelect(ticket)}
                    className="text-sm text-[#E89F88] dark:text-blue-400 font-medium hover:underline"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex gap-8 h-[calc(100vh-200px)]">
          {/* Left Panel - Ticket List */}
          <div className="w-2/5 flex flex-col">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl p-6 mb-6">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-[#6b5f57] dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-[#F5ECE5]/30 dark:bg-slate-700/30 border border-[#F5ECE5] dark:border-slate-600/40 rounded-xl text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-400/50"
                  placeholder="Search tickets by ID, customer name..."
                  type="text"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 text-sm bg-[#E89F88] hover:bg-[#D68B72] text-white rounded-xl font-medium transition-colors">All Tickets</button>
                <button className="px-4 py-2 text-sm bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white rounded-xl transition-colors">Open</button>
                <button className="px-4 py-2 text-sm bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white rounded-xl transition-colors">Closed</button>
                <button className="px-4 py-2 text-sm bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 text-[#6b5f57] dark:text-slate-300 hover:text-[#333333] dark:hover:text-white rounded-xl transition-colors">High Priority</button>
              </div>
            </div>

            {/* Ticket List */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden flex-1">
              <div className="divide-y divide-[#F5ECE5]/50 dark:divide-slate-600/20 h-full overflow-y-auto">
                {mockTickets.map((ticket) => (
                  <div 
                    key={ticket.id}
                    onClick={() => handleDesktopTicketSelect(ticket)}
                    className={`p-6 cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id 
                        ? 'bg-[#E89F88]/10 dark:bg-blue-500/10 border-l-4 border-[#E89F88] dark:border-blue-500' 
                        : 'hover:bg-[#F5ECE5]/30 dark:hover:bg-slate-700/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-[#333333] dark:text-white text-lg">{ticket.id}</h3>
                          <span className="text-sm text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700 px-2 py-1 rounded-lg">{ticket.category}</span>
                        </div>
                        <p className="text-[#333333] dark:text-slate-200 font-medium mb-1">{ticket.customer}</p>
                        <p className="text-sm text-[#6b5f57] dark:text-slate-400 line-clamp-2">{ticket.description}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className="text-xs text-[#6b5f57] dark:text-slate-400">{ticket.timeAgo}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6b5f57] dark:text-slate-400">
                        {ticket.assignedTo ? `Assigned to ${ticket.assignedTo}` : 'Unassigned'}
                      </span>
                      {selectedTicket?.id === ticket.id && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#E89F88] dark:bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-xs text-[#E89F88] dark:text-blue-300 font-medium">Selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Ticket Detail */}
          <div className="flex-1 flex flex-col">
            {selectedTicket ? (
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex-1">
                {/* Header */}
                <div className="p-6 border-b border-[#F5ECE5]/30 dark:border-slate-600/30 bg-[#F5ECE5]/20 dark:bg-slate-800/50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-[#333333] dark:text-white mb-1">{selectedTicket.id} - {selectedTicket.category}</h2>
                      <p className="text-[#6b5f57] dark:text-slate-400">from {selectedTicket.customer}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Reply
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-xl ${getPriorityColor(selectedTicket.priority)}`}>{selectedTicket.priority} Priority</span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-xl ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span>
                    <span className="px-3 py-1 text-sm text-[#6b5f57] dark:text-slate-400 bg-[#F5ECE5] dark:bg-slate-700 rounded-xl">Updated {selectedTicket.timeAgo}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-[#F5ECE5]/30 dark:bg-slate-700/30">
                      <h4 className="font-semibold text-[#333333] dark:text-white mb-3">Customer Details</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-[#6b5f57] dark:text-slate-300"><span className="font-medium">Email:</span> {selectedTicket.email}</p>
                        <p className="text-sm text-[#6b5f57] dark:text-slate-300"><span className="font-medium">Phone:</span> {selectedTicket.phone}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F5ECE5]/30 dark:bg-slate-700/30">
                      <h4 className="font-semibold text-[#333333] dark:text-white mb-3">Order Details</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-[#6b5f57] dark:text-slate-300"><span className="font-medium">Order ID:</span> {selectedTicket.orderId}</p>
                        <p className="text-sm text-[#6b5f57] dark:text-slate-300"><span className="font-medium">Restaurant:</span> {selectedTicket.restaurant}</p>
                      </div>
                    </div>
                  </div>

                  {/* Conversation */}
                  <div>
                    <h4 className="font-semibold text-[#333333] dark:text-white mb-4">Conversation History</h4>
                    <div className="space-y-4">
                      {selectedTicket.messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-3 ${message.isAgent ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 ${
                            message.isAgent ? 'bg-[#E89F88] dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`} />
                          <div className={`flex-1 p-4 rounded-xl ${
                            message.isAgent 
                              ? 'bg-[#E89F88]/20 dark:bg-blue-500/20 rounded-tr-md' 
                              : 'bg-[#F5ECE5]/50 dark:bg-slate-700/50 rounded-tl-md'
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-medium text-[#333333] dark:text-white">{message.sender}</p>
                              <p className="text-xs text-[#6b5f57] dark:text-slate-400">{message.time}</p>
                            </div>
                            <p className="text-[#6b5f57] dark:text-slate-300">{message.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reply Section */}
                <div className="p-6 border-t border-[#F5ECE5]/30 dark:border-slate-600/30 bg-[#F5ECE5]/20 dark:bg-slate-800/50">
                  <div className="relative mb-4">
                    <textarea 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="w-full p-4 pr-16 bg-white dark:bg-slate-700/50 border border-[#F5ECE5] dark:border-slate-600/40 rounded-xl text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-400/50 resize-none" 
                      placeholder="Type your reply here..." 
                      rows={3}
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="absolute top-1/2 right-4 -translate-y-1/2 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 rounded-xl transition-colors">
                      Add Note
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 rounded-xl transition-colors">
                      Escalate
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 rounded-xl transition-colors">
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-2xl border border-[#F5ECE5] dark:border-slate-600/40 rounded-2xl overflow-hidden shadow-lg flex-1">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <svg className="w-16 h-16 text-[#6b5f57] dark:text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-[#333333] dark:text-white mb-2">Select a Ticket</h3>
                      <p className="text-[#6b5f57] dark:text-slate-400">Choose a ticket from the list to view its details and conversation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Chat Popup */}
      {showMobileChat && selectedTicket && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl max-h-[90vh] w-full overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            {/* Chat Header */}
            <div className="p-4 border-b border-[#F5ECE5] dark:border-slate-600/40 bg-[#F5ECE5]/20 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-[#333333] dark:text-white">{selectedTicket.id} - {selectedTicket.category}</h3>
                  <p className="text-sm text-[#6b5f57] dark:text-slate-400">{selectedTicket.customer}</p>
                </div>
                <button 
                  onClick={() => setShowMobileChat(false)}
                  className="p-2 hover:bg-[#F5ECE5] dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-[#6b5f57] dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[50vh]">
              {selectedTicket.messages.map((message, index) => (
                <div key={index} className={`flex items-start gap-3 ${message.isAgent ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 ${
                    message.isAgent ? 'bg-[#E89F88] dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <div className={`flex-1 p-3 rounded-xl ${
                    message.isAgent 
                      ? 'bg-[#E89F88]/20 dark:bg-blue-500/20 rounded-tr-md' 
                      : 'bg-[#F5ECE5]/50 dark:bg-slate-700/50 rounded-tl-md'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium text-[#333333] dark:text-white text-sm">{message.sender}</p>
                      <p className="text-xs text-[#6b5f57] dark:text-slate-400">{message.time}</p>
                    </div>
                    <p className="text-[#6b5f57] dark:text-slate-300 text-sm">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-[#F5ECE5] dark:border-slate-600/40 bg-[#F5ECE5]/10 dark:bg-slate-800/30">
              <div className="relative">
                <textarea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full p-3 pr-12 bg-white dark:bg-slate-700/50 border border-[#F5ECE5] dark:border-slate-600/40 rounded-xl text-[#333333] dark:text-white placeholder:text-[#6b5f57] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E89F88]/50 dark:focus:ring-blue-400/50 resize-none" 
                  placeholder="Type your reply..." 
                  rows={2}
                />
                <button 
                  onClick={handleSendMessage}
                  className="absolute bottom-2 right-2 bg-[#E89F88] hover:bg-[#D68B72] dark:bg-blue-600 dark:hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 rounded-lg transition-colors flex-1">
                  Add Note
                </button>
                <button className="px-3 py-2 text-sm font-medium text-[#6b5f57] dark:text-slate-300 bg-[#F5ECE5] dark:bg-slate-700 hover:bg-[#E89F88]/20 dark:hover:bg-slate-600 rounded-lg transition-colors flex-1">
                  Escalate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;