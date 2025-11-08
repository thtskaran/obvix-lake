import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sendChatMessage } from "../app/api/endpoints";
import { usePersonas } from "../hooks/usePersonas";
import type {
  ChatResponse,
  ChatSource,
  TicketKnowledgeMatch,
  TicketRouteResponse,
} from "../types/api";

const DEFAULT_PERSONA = "ol_rpi";

type MessageRole = "user" | "assistant" | "system";

interface ConsoleMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: ChatResponse;
  error?: boolean;
}

function createMessageId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function confidenceTone(confidence?: ChatResponse["confidence"]) {
  const normalized = confidence?.toUpperCase() ?? "";
  switch (normalized) {
    case "HIGH":
      return {
        label: "High",
        badgeClass:
          "bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
        dotClass: "bg-emerald-500",
      };
    case "MEDIUM":
    case "MED":
      return {
        label: "Medium",
        badgeClass:
          "bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
        dotClass: "bg-amber-500",
      };
    case "LOW":
      return {
        label: "Low",
        badgeClass:
          "bg-rose-100/80 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300",
        dotClass: "bg-rose-500",
      };
    default:
      return {
        label: confidence ?? "Unknown",
        badgeClass:
          "bg-slate-200/70 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300",
        dotClass: "bg-slate-400",
      };
  }
}

function formatSimilarity(similarity?: number): string {
  if (typeof similarity !== "number" || Number.isNaN(similarity)) {
    return "–";
  }
  return `${Math.round(similarity * 100)}%`;
}

function isTicketRouteResponse(value: unknown): value is TicketRouteResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<TicketRouteResponse>;
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    "decision" in candidate &&
    "classification" in candidate &&
    "matches" in candidate
  );
}

function sourceKey(source: ChatSource, index: number) {
  return `${source.id ?? source.source ?? "source"}_${index}`;
}

function matchKey(match: TicketKnowledgeMatch, index: number) {
  return `${match.article_id ?? match.title ?? "match"}_${index}`;
}

const AssistantMetadata: React.FC<{ metadata?: ChatResponse }> = ({ metadata }) => {
  if (!metadata) {
    return null;
  }

  const tone = confidenceTone(metadata.confidence);
  const router = isTicketRouteResponse(metadata.router) ? metadata.router : undefined;
  const matches = router?.matches ?? [];
  const sources = metadata.sources ?? [];

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#F5ECE5] dark:border-slate-600/40 bg-[#FDFBFA]/80 dark:bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${tone.badgeClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${tone.dotClass}`} />
          Confidence: {tone.label}
        </span>
        {metadata.ticket_forwarded && (
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 dark:bg-blue-500/20 px-3 py-1 text-blue-700 dark:text-blue-300">
            Forwarded to ticketing
          </span>
        )}
        {metadata.escalation_deferred && (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 dark:bg-amber-500/20 px-3 py-1 text-amber-700 dark:text-amber-300">
            Escalation deferred
          </span>
        )}
        {metadata.ticket_section_closed && (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 px-3 py-1 text-emerald-700 dark:text-emerald-300">
            Ticket section closed
          </span>
        )}
        {metadata.glpi_ticket_id && (
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-100/80 dark:bg-purple-500/20 px-3 py-1 text-purple-700 dark:text-purple-300">
            GLPI #{metadata.glpi_ticket_id}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 text-sm">
          <p className="text-[#333333] dark:text-white font-semibold">Knowledge lookups</p>
          <p className="text-[#6b5f57] dark:text-slate-300">
            {metadata.assist_attempts_with_kb > 0
              ? `${metadata.assist_attempts_with_kb} knowledge base attempts`
              : "No knowledge base lookups recorded."}
          </p>
        </div>

        {(metadata.active_ticket || metadata.ticket_status) && (
          <div className="space-y-1 text-sm">
            <p className="text-[#333333] dark:text-white font-semibold">Ticket status</p>
            <p className="text-[#6b5f57] dark:text-slate-300">
              {metadata.active_ticket?.ticket_id
                ? `#${metadata.active_ticket.ticket_id} · ${
                    metadata.active_ticket.status ??
                    metadata.ticket_status ??
                    "Status unknown"
                  }`
                : metadata.ticket_status ??
                  metadata.active_ticket?.status ??
                  "Not available"}
            </p>
          </div>
        )}
      </div>

      {metadata.ticket_section_closed && (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          <p className="font-semibold">{metadata.ticket_section_closed.notice}</p>
          {metadata.ticket_section_closed.resolution_summary && (
            <p className="mt-1 whitespace-pre-wrap">
              {Array.isArray(metadata.ticket_section_closed.resolution_summary)
                ? metadata.ticket_section_closed.resolution_summary.join("\n")
                : metadata.ticket_section_closed.resolution_summary}
            </p>
          )}
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-2 text-sm">
          <p className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">
            Evidence sources
          </p>
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div
                key={sourceKey(source, index)}
                className="rounded-xl border border-[#F5ECE5] dark:border-slate-600/40 bg-white/80 dark:bg-slate-900/40 p-3"
              >
                <p className="text-sm font-medium text-[#333333] dark:text-white">
                  {source.source ?? `Source ${index + 1}`}
                </p>
                <p className="text-xs text-[#6b5f57] dark:text-slate-400">ID: {source.id}</p>
                {source.preview && (
                  <p className="mt-2 text-sm leading-relaxed text-[#6b5f57] dark:text-slate-300">
                    {source.preview}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {router && (
        <div className="space-y-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">
            Routing decision
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#F5ECE5] dark:border-slate-600/40 bg-white/70 dark:bg-slate-900/40 p-3">
              <p className="text-xs uppercase text-[#6b5f57] dark:text-slate-400">Decision</p>
              <p className="text-sm font-semibold text-[#333333] dark:text-white">
                {router.decision === "human_agent"
                  ? "Hand off to human agent"
                  : "Assistant handles response"}
              </p>
            </div>
            <div className="rounded-xl border border-[#F5ECE5] dark:border-slate-600/40 bg-white/70 dark:bg-slate-900/40 p-3">
              <p className="text-xs uppercase text-[#6b5f57] dark:text-slate-400">
                Route to human
              </p>
              <p className="text-sm font-semibold text-[#333333] dark:text-white">
                {router.route_to_human ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-xl border border-[#F5ECE5] dark:border-slate-600/40 bg-white/70 dark:bg-slate-900/40 p-3">
              <p className="text-xs uppercase text-[#6b5f57] dark:text-slate-400">Category</p>
              <p className="text-sm font-semibold text-[#333333] dark:text-white">
                {router.classification?.issue_category ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-[#F5ECE5] dark:border-slate-600/40 bg-white/70 dark:bg-slate-900/40 p-3">
              <p className="text-xs uppercase text-[#6b5f57] dark:text-slate-400">Urgency</p>
              <p className="text-sm font-semibold text-[#333333] dark:text-white">
                {router.classification?.urgency ?? "—"}
              </p>
            </div>
          </div>

          {matches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-[#6b5f57] dark:text-slate-400">
                Top knowledge matches
              </p>
              <div className="space-y-2">
                {matches.slice(0, 3).map((match, index) => (
                  <div
                    key={matchKey(match, index)}
                    className="rounded-xl border border-[#F5ECE5] dark:border-slate-600/40 bg-white/80 dark:bg-slate-900/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#333333] dark:text-white">
                          {match.title ?? `Match ${index + 1}`}
                        </p>
                        {(match.article_id || match.source_ticket_id) && (
                          <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                            {[match.article_id && `Article ${match.article_id}`, match.source_ticket_id && `Ticket ${match.source_ticket_id}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[#E57252] dark:text-blue-300">
                        {formatSimilarity(match.similarity)}
                      </span>
                    </div>
                    {match.content && (
                      <p className="mt-2 text-sm leading-relaxed text-[#6b5f57] dark:text-slate-300 line-clamp-4">
                        {match.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MessageStyles {
  container: string;
  bubble: string;
  label: string;
  labelColor: string;
}

function getMessageStyles(role: MessageRole, error?: boolean): MessageStyles {
  switch (role) {
    case "assistant":
      return {
        container: "self-start",
        bubble:
          "max-w-2xl rounded-3xl rounded-tl-xl border border-[#F5ECE5] dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/70 shadow-sm",
        label: "Assistant",
        labelColor: "text-[#E57252] dark:text-blue-300",
      };
    case "user":
      return {
        container: "self-end",
        bubble:
          "max-w-xl rounded-3xl rounded-br-xl border border-[#E89F88]/50 bg-[#E89F88]/15 text-[#3F2D25] dark:bg-blue-500/10 dark:text-slate-50",
        label: "You",
        labelColor: "text-[#6b5f57] dark:text-slate-300",
      };
    default:
      return {
        container: "self-center",
        bubble: error
          ? "max-w-xl rounded-3xl border border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
          : "max-w-xl rounded-3xl border border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-600/40 dark:bg-slate-900/60 dark:text-slate-200",
        label: "System",
        labelColor: error
          ? "text-rose-700 dark:text-rose-200"
          : "text-slate-600 dark:text-slate-300",
      };
  }
}

export const AILearning: React.FC = () => {
  const [persona, setPersona] = useState<string>(DEFAULT_PERSONA);
  const [userId, setUserId] = useState<string>("demo_user");
  const [message, setMessage] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeController, setActiveController] = useState<AbortController | null>(null);

  const { personas, isLoading, error: personasError, refresh } = usePersonas([
    DEFAULT_PERSONA,
  ]);

  const personaOptions = useMemo(() => {
    const unique = new Set<string>();
    const result: string[] = [];
    personas.forEach((item) => {
      const trimmed = item.trim();
      if (trimmed && !unique.has(trimmed)) {
        unique.add(trimmed);
        result.push(trimmed);
      }
    });
    if (!unique.has(DEFAULT_PERSONA)) {
      result.unshift(DEFAULT_PERSONA);
    }
    return result;
  }, [personas]);

  useEffect(() => {
    if (!persona && personaOptions.length) {
      setPersona(personaOptions[0]);
    }
  }, [persona, personaOptions]);

  useEffect(
    () => () => {
      activeController?.abort();
    },
    [activeController],
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (isSending) {
      return;
    }
    const trimmedMessage = message.trim();
    const trimmedPersona = persona.trim();
    const trimmedUser = userId.trim();

    if (!trimmedMessage) {
      setFormError("Enter a message for the assistant.");
      return;
    }
    if (!trimmedPersona) {
      setFormError("Choose a persona (e.g. ol_rpi).");
      return;
    }
    if (!trimmedPersona.startsWith("ol_")) {
      setFormError("Persona IDs should follow the ol_* format.");
      return;
    }
    if (!trimmedUser) {
      setFormError("Provide a user identifier so we can route context.");
      return;
    }

    setFormError(null);

    const controller = new AbortController();
    setActiveController(controller);

    const outbound: ConsoleMessage = {
      id: createMessageId("user"),
      role: "user",
      content: trimmedMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, outbound]);
    setMessage("");
    setIsSending(true);

    try {
      const response = await sendChatMessage(
        {
          persona_name: trimmedPersona,
          user_id: trimmedUser,
          message: trimmedMessage,
        },
        controller.signal,
      );

      const inbound: ConsoleMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        metadata: response,
      };

      setMessages((prev) => [...prev, inbound]);
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : "Assistant is unavailable right now.";
      const systemMessage: ConsoleMessage = {
        id: createMessageId("system"),
        role: "system",
        content: fallback,
        timestamp: new Date().toISOString(),
        error: true,
      };
      setMessages((prev) => [...prev, systemMessage]);
    } finally {
      setIsSending(false);
      setActiveController(null);
    }
  }, [isSending, message, persona, userId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleClearConversation = () => {
    activeController?.abort();
    setMessages([]);
    setFormError(null);
  };

  const handleRefreshPersonas = async () => {
    await refresh();
  };

  return (
    <div className="min-h-screen bg-[#FDFBFA] dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,159,136,0.05),transparent)] dark:bg-[radial-gradient(circle_at_20%_40%,rgba(120,119,198,0.15),transparent)] opacity-60" />
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#333333] dark:text-white tracking-tight">
            Assistant Chat Console
          </h1>
          <p className="text-[#6b5f57] dark:text-slate-400 text-base lg:text-lg max-w-3xl">
            Talk to personas, review the router&apos;s decisions, and inspect the evidence the assistant uses for every answer.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,380px),1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#333333] dark:text-white">
                Conversation setup
              </h2>
              <p className="mt-1 text-sm text-[#6b5f57] dark:text-slate-400">
                Personas drive tone and knowledge. Provide a user ID to isolate history and routing.
              </p>

              <div className="mt-5 space-y-5 text-sm">
                <label className="block space-y-2">
                  <span className="font-medium text-[#6b5f57] dark:text-slate-300">
                    Persona ID
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-2xl border border-[#F5ECE5] dark:border-slate-700/50 bg-white/80 dark:bg-slate-950/40 px-4 py-3 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:focus:ring-blue-500/40"
                      placeholder="ol_rpi"
                      value={persona}
                      onChange={(event) => setPersona(event.target.value)}
                      list={personaOptions.length ? "chat-persona-options" : undefined}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={handleRefreshPersonas}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#F5ECE5] dark:border-slate-700/40 bg-white/70 dark:bg-slate-900/40 px-3 py-2 font-semibold text-[#6b5f57] dark:text-slate-200 transition hover:bg-[#F5ECE5]/60 dark:hover:bg-slate-800/60"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#E89F88]/40 border-t-[#E89F88]" />
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v6h6M20 20v-6h-6"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 19A9 9 0 0119 5"
                          />
                        </svg>
                      )}
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                    {isLoading
                      ? "Syncing personas…"
                      : personasError
                      ? "We couldn’t sync personas. Retry or type an ID manually."
                      : personaOptions.length
                      ? `Choose from ${personaOptions.length} personas or type any ol_* ID.`
                      : "Type a persona ID that begins with ol_."}
                  </p>
                  {personaOptions.length > 0 && (
                    <datalist id="chat-persona-options">
                      {personaOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  )}
                </label>

                <label className="block space-y-2">
                  <span className="font-medium text-[#6b5f57] dark:text-slate-300">
                    User identifier
                  </span>
                  <input
                    className="w-full rounded-2xl border border-[#F5ECE5] dark:border-slate-700/50 bg-white/80 dark:bg-slate-950/40 px-4 py-3 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:focus:ring-blue-500/40"
                    placeholder="demo_user"
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                  />
                  <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                    Use a consistent ID to keep conversation context isolated.
                  </p>
                </label>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearConversation}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#F5ECE5] dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 px-4 py-2 text-sm font-semibold text-[#6b5f57] dark:text-slate-200 transition hover:bg-[#F5ECE5]/50 dark:hover:bg-slate-800/60"
                  disabled={messages.length === 0}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6h18M8 6v12m8-12v12M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14"
                    />
                  </svg>
                  Clear
                </button>
                {formError && (
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                    {formError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#F5ECE5] dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur shadow-sm flex flex-col">
            <div className="border-b border-[#F5ECE5] dark:border-slate-700/40 px-6 py-4">
              <p className="text-sm font-semibold text-[#333333] dark:text-white">
                Conversation
              </p>
              <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                Assistant answers stream here. Press Ctrl+Enter to send quickly.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-[#6b5f57] dark:text-slate-400">
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-[#E89F88]/60 dark:border-blue-500/40 text-[#E57252] dark:text-blue-300">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 11c0-3.866 3.582-7 8-7M4 4h8m0 0v8m0-8L5.41 12.59"
                      />
                    </svg>
                  </div>
                  <div className="max-w-sm space-y-1">
                    <p className="font-semibold text-[#333333] dark:text-white">
                      Start a chat
                    </p>
                    <p>
                      Ask the assistant to resolve a customer question, summarize a ticket, or escalate to an agent.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((entry) => {
                    const styles = getMessageStyles(entry.role, entry.error);
                    return (
                      <div
                        key={entry.id}
                        className={`${styles.container} flex flex-col gap-2`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-semibold ${styles.labelColor}`}>
                            {styles.label}
                          </span>
                          <span className="text-[11px] uppercase tracking-wide text-[#9B8B82] dark:text-slate-500">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                        <div className={`${styles.bubble} px-5 py-4`}>
                          <p className="text-sm leading-relaxed text-[#3f2d25] dark:text-slate-100 whitespace-pre-wrap">
                            {entry.content}
                          </p>
                          {entry.role === "assistant" && (
                            <AssistantMetadata metadata={entry.metadata} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-[#F5ECE5] dark:border-slate-700/40 px-6 py-5 space-y-4">
              <label className="block">
                <span className="sr-only">Message</span>
                <textarea
                  className="w-full min-h-[120px] rounded-2xl border border-[#F5ECE5] dark:border-slate-700/50 bg-white dark:bg-slate-950/40 px-4 py-3 text-sm text-[#333333] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 dark:focus:ring-blue-500/40"
                  placeholder="Draft your message for the assistant…"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#6b5f57] dark:text-slate-400">
                  Tip: Use Ctrl + Enter to send.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E89F88] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D97D61] focus:outline-none focus:ring-2 focus:ring-[#E89F88]/40 disabled:cursor-not-allowed disabled:bg-[#E89F88]/60"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                      Send message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AILearning;