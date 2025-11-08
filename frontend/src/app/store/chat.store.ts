import { create } from 'zustand';
import { ChatMessage } from '../../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentTicketId: string | null;
  // TODO: Add actions for sending messages, loading chat history, etc.
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  currentTicketId: null,
}));