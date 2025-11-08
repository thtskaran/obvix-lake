import { createMachine } from 'xstate';

// Stub XState machine for support agent workflow
export const supportMachine = createMachine({
  id: 'support',
  initial: 'idle',
  states: {
    idle: {
      on: {
        // TODO: Add transitions for ticket handling, chat sessions, etc.
        START_CHAT: 'chatting',
        VIEW_TICKET: 'reviewing',
      },
    },
    chatting: {
      on: {
        END_CHAT: 'idle',
        ESCALATE: 'escalating',
      },
    },
    reviewing: {
      on: {
        CLOSE_TICKET: 'idle',
        UPDATE_TICKET: 'updating',
      },
    },
    escalating: {
      on: {
        ESCALATION_COMPLETE: 'idle',
      },
    },
    updating: {
      on: {
        UPDATE_COMPLETE: 'reviewing',
      },
    },
  },
});