import { create } from 'zustand';
import { User } from '../../types';

interface FSMState {
  currentUser: User | null;
  sessionActive: boolean;
  systemStatus: 'idle' | 'processing' | 'error';
  // TODO: Add actions for managing application state
}

export const useFSMStore = create<FSMState>((set) => ({
  currentUser: null,
  sessionActive: false,
  systemStatus: 'idle',
}));