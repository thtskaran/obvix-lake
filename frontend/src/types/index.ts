// Shared types for the AI support agent console

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'admin';
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'ai';
  timestamp: Date;
}

export interface Ticket {
  id: string;
  title: string;
  status: 'open' | 'pending' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface KPIMetric {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface Integration {
  id: string;
  name: string;
  type: 'crm' | 'helpdesk' | 'chat' | 'email';
  status: 'connected' | 'disconnected' | 'error';
}