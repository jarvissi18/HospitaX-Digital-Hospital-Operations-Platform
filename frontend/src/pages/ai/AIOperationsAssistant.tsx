import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  Loader2,
  Send,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  confirmAIOperation,
  getAIOperationErrorMessage,
  sendAIMessage,
  type AIOperationResponse,
} from "../../services/aiOperationsApi";

import { useAuth } from "../../context/AuthContext";

// =====================================================
// TYPES
// =====================================================

type MessageRole = "user" | "assistant";

type AssistantMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  response?: AIOperationResponse;
  confirmationDismissed?: boolean;
};

// =====================================================
// CONSTANTS
// =====================================================

const MAX_MESSAGE_LENGTH = 2000;

// =====================================================
// HELPERS
// =====================================================

function createMessageId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case "Administrator":
      return "Administrator";

    case "Doctor":
      return "Doctor";

    case "Nurse":
      return "Nurse";

    case "Receptionist":
      return "Receptionist";

    case "Housekeeper":
      return "Housekeeper";

    default:
      return "Hospital Staff";
  }
}

function getInitials(name?: string): string {
  if (!name?.trim()) {
    return "U";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");
}

// =====================================================
// SIMPLE ASSISTANT TEXT FORMATTER
// =====================================================

function renderAssistantText(
  content: string,
) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return (
            <div
              key={`empty-${index}`}
              className="h-1"
            />
          );
        }

        const bullet =
          trimmed.match(/^[-*]\s+(.*)$/);

        const numbered =
          trimmed.match(
            /^\d+\.\s+(.*)$/,
          );

        const formatInline = (
          value: string,
        ) => {
          const parts = value.split(
            /(\*\*[^*]+\*\*|`[^`]+`)/g,
          );

          return parts.map(
            (part, partIndex) => {
              if (
                part.startsWith("**") &&
                part.endsWith("**")
              ) {
                return (
                  <strong
                    key={partIndex}
                    className="font-semibold text-slate-900"
                  >
                    {part.slice(
                      2,
                      -2,
                    )}
                  </strong>
                );
              }

              if (
                part.startsWith("`") &&
                part.endsWith("`")
              ) {
                return (
                  <code
                    key={partIndex}
                    className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]"
                  >
                    {part.slice(
                      1,
                      -1,
                    )}
                  </code>
                );
              }

              return (
                <span key={partIndex}>
                  {part}
                </span>
              );
            },
          );
        };

        if (bullet) {
          return (
            <div
              key={`bullet-${index}`}
              className="flex gap-2"
            >
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />

              <span>
                {formatInline(
                  bullet[1],
                )}
              </span>
            </div>
          );
        }

        if (numbered) {
          return (
            <div
              key={`number-${index}`}
              className="flex gap-2"
            >
              <span className="text-slate-400">
                {trimmed.match(
                  /^\d+/,
                )?.[0]}
                .
              </span>

              <span>
                {formatInline(
                  numbered[1],
                )}
              </span>
            </div>
          );
        }

        return (
          <p key={`line-${index}`}>
            {formatInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AIOperationsAssistant() {
  const { user } = useAuth();

  const [messages, setMessages] =
    useState<AssistantMessage[]>([]);

  const [input, setInput] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  // ===================================================
  // USER
  // ===================================================

  const userName =
    user?.full_name ||
    user?.employee_id ||
    "User";

  const roleLabel =
    getRoleLabel(user?.role);

  const initials =
    getInitials(userName);

  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  // ===================================================
  // TEXTAREA HEIGHT
  // ===================================================

  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        140,
      )}px`;
  }, [input]);

  // ===================================================
  // SEND
  // ===================================================

  async function handleSend(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    const message =
      input.trim();

    if (!message || isLoading) {
      return;
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: createMessageId(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const response =
        await sendAIMessage(message);

      const assistantMessage: AssistantMessage = {
        id: createMessageId(),
        role: "assistant",
        content:
          response.message ||
          "No response was returned.",
        timestamp: new Date(),
        response,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            getAIOperationErrorMessage(
              error,
            ),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }

  // ===================================================
  // CONFIRM
  // ===================================================

  async function handleConfirm(
    messageId: string,
  ) {
    const target =
      messages.find(
        (message) =>
          message.id === messageId,
      );

    const response =
      target?.response;

    if (!target || !response || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const confirmedResponse =
        await confirmAIOperation({
          message: target.content,
          tool_name:
            response.tool_name,
          arguments:
            getPlanArguments(
              response,
            ),
        });

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content:
                  confirmedResponse.message ||
                  "Operation completed.",
                response:
                  confirmedResponse,
                confirmationDismissed:
                  true,
              }
            : message,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content:
                  getAIOperationErrorMessage(
                    error,
                  ),
                confirmationDismissed:
                  true,
              }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }

  // ===================================================
  // CANCEL
  // ===================================================

  function handleCancel(
    messageId: string,
  ) {
    if (isLoading) {
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content:
                "Operation cancelled. No changes were made.",
              confirmationDismissed:
                true,
            }
          : message,
      ),
    );
  }

  // ===================================================
  // COPY
  // ===================================================

  async function handleCopy(
    message: AssistantMessage,
  ) {
    try {
      await navigator.clipboard.writeText(
        message.content,
      );

      setCopiedMessageId(
        message.id,
      );

      setTimeout(() => {
        setCopiedMessageId(null);
      }, 1500);
    } catch {
      // Clipboard unavailable.
    }
  }

  // ===================================================
  // CLEAR
  // ===================================================

  function handleClear() {
    if (isLoading) {
      return;
    }

    setMessages([]);
    setInput("");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">

      {/* =================================================
          HEADER
      ================================================== */}

      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">

        <div className="flex min-w-0 items-center gap-3">

          {/* SAME AI ROBOT LOGO */}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Bot
              size={17}
              strokeWidth={1.9}
            />
          </div>

          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <h1 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
                AI Operations Assistant
              </h1>

              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                AI
              </span>

            </div>

            <p className="truncate text-[10px] text-slate-400">
              {roleLabel} access
            </p>

          </div>

        </div>

        <div className="flex items-center gap-2">

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
            >
              Clear
            </button>
          )}

          <div className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2">

            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[8px] font-bold text-slate-600">
              {initials}
            </div>

            <span className="hidden max-w-[110px] truncate text-[10px] font-medium text-slate-600 sm:block">
              {userName}
            </span>

          </div>

        </div>

      </header>

      {/* =================================================
          CHAT
      ================================================== */}

      <main className="min-h-0 flex-1 overflow-hidden">

        <div className="flex h-full flex-col">

          {/* EMPTY */}

          {messages.length === 0 ? (

            <div className="flex flex-1 items-center justify-center px-5">

              <div className="w-full max-w-[620px] text-center">

                {/* SAME AI ROBOT LOGO */}

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Bot
                    size={22}
                    strokeWidth={1.8}
                  />
                </div>

                <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em] text-slate-900">
                  How can I help?
                </h2>

                <p className="mx-auto mt-2 max-w-[460px] text-[12px] leading-5 text-slate-400">
                  Ask about hospital information
                  available to your role.
                </p>

              </div>

            </div>

          ) : (

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">

              <div className="mx-auto max-w-[820px] space-y-5">

                {messages.map(
                  (message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isLoading={isLoading}
                      copied={
                        copiedMessageId ===
                        message.id
                      }
                      onCopy={() =>
                        handleCopy(
                          message,
                        )
                      }
                      onConfirm={() =>
                        handleConfirm(
                          message.id,
                        )
                      }
                      onCancel={() =>
                        handleCancel(
                          message.id,
                        )
                      }
                    />
                  ),
                )}

                {isLoading && (
                  <div className="flex items-start gap-2.5">

                    {/* SAME AI ROBOT LOGO */}

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                      <Bot size={14} />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">

                      <div className="flex items-center gap-2">

                        <Loader2
                          size={13}
                          className="animate-spin text-slate-400"
                        />

                        <span className="text-[10px] text-slate-400">
                          Processing request...
                        </span>

                      </div>

                    </div>

                  </div>
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />

              </div>

            </div>

          )}

          {/* =================================================
              COMPOSER
          ================================================== */}

          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">

            <form
              onSubmit={handleSend}
              className="mx-auto max-w-[820px]"
            >

              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 transition focus-within:border-slate-300 focus-within:shadow-sm">

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      if (
                        input.trim() &&
                        !isLoading
                      ) {
                        void handleSend();
                      }
                    }
                  }}
                  placeholder="Ask HospitaX AI anything available to your role.."
                  rows={1}
                  maxLength={
                    MAX_MESSAGE_LENGTH
                  }
                  disabled={isLoading}
                  className="max-h-[140px] min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 text-[12px] leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    isLoading
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  aria-label="Send"
                >
                  {isLoading ? (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Send
                      size={15}
                    />
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>

      </main>

    </div>
  );
}

// =====================================================
// MESSAGE
// =====================================================

function MessageBubble({
  message,
  isLoading,
  copied,
  onCopy,
  onConfirm,
  onCancel,
}: {
  message: AssistantMessage;
  isLoading: boolean;
  copied: boolean;
  onCopy: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isUser =
    message.role === "user";

  const response =
    message.response;

  const needsConfirmation =
    !isUser &&
    response &&
    !message.confirmationDismissed &&
    (
      response.status ===
        "needs_confirmation" ||
      response.requires_confirmation ===
        true
    );

  const needsClarification =
    !isUser &&
    response?.status ===
      "needs_clarification";

  const isError =
    !isUser &&
    response?.status === "error";

  return (
    <div
      className={
        isUser
          ? "flex justify-end"
          : "flex items-start gap-2.5"
      }
    >

      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Bot size={14} />
        </div>
      )}

      <div
        className={
          isUser
            ? "max-w-[78%]"
            : "min-w-0 max-w-[82%]"
        }
      >

        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-md bg-slate-950 px-3.5 py-2.5 text-white"
              : "rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3.5 py-3 text-slate-700"
          }
        >

          <div
            className={
              isUser
                ? "whitespace-pre-wrap text-[12px] leading-5 text-slate-100"
                : "text-[12px] leading-5"
            }
          >
            {isUser
              ? message.content
              : renderAssistantText(
                  message.content,
                )}
          </div>

          {/* CONFIRM */}

          {needsConfirmation && (
            <div className="mt-3 border-t border-slate-100 pt-3">

              <div className="flex items-center gap-2 text-[10px] font-medium text-amber-700">

                <AlertCircle
                  size={13}
                />

                <span>
                  Confirmation required
                </span>

              </div>

              {response?.confirmation_message && (
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                  {
                    response.confirmation_message
                  }
                </p>
              )}

              <div className="mt-2.5 flex gap-2">

                <button
                  type="button"
                  onClick={
                    onConfirm
                  }
                  disabled={
                    isLoading
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Check
                    size={11}
                  />
                  Confirm
                </button>

                <button
                  type="button"
                  onClick={
                    onCancel
                  }
                  disabled={
                    isLoading
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X
                    size={11}
                  />
                  Cancel
                </button>

              </div>

            </div>
          )}

          {/* CLARIFICATION */}

          {needsClarification && (
            <div className="mt-3 flex items-start gap-2 border-t border-slate-100 pt-3">

              <AlertCircle
                size={13}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <p className="text-[10px] leading-4 text-blue-700">
                {response?.clarification_question ||
                  "Please provide the missing information."}
              </p>

            </div>
          )}

          {/* ERROR */}

          {isError && (
            <div className="mt-3 flex items-start gap-2 border-t border-red-100 pt-3">

              <AlertCircle
                size={13}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <p className="text-[10px] leading-4 text-red-700">
                The operation could not be
                completed.
              </p>

            </div>
          )}

        </div>

        {/* ACTIONS */}

        <div className="mt-1 flex items-center gap-2 px-1">

          <span className="text-[9px] text-slate-400">
            {formatTime(
              message.timestamp,
            )}
          </span>

          {!isUser && (
            <>
              <span className="text-[9px] text-slate-200">
                •
              </span>

              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600"
              >
                {copied ? (
                  <>
                    <Check
                      size={9}
                    />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy
                      size={9}
                    />
                    Copy
                  </>
                )}
              </button>
            </>
          )}

        </div>

      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
          <UserRound
            size={13}
          />
        </div>
      )}

    </div>
  );
}

// =====================================================
// PLAN ARGUMENTS
// =====================================================

function getPlanArguments(
  response: AIOperationResponse,
): Record<string, unknown> {
  const plans: unknown[] = [
    response.plan,
    response.metadata?.plan,
  ];

  for (const value of plans) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      continue;
    }

    const plan =
      value as {
        arguments?: unknown;
      };

    if (
      plan.arguments &&
      typeof plan.arguments ===
        "object" &&
      !Array.isArray(
        plan.arguments,
      )
    ) {
      return plan.arguments as Record<
        string,
        unknown
      >;
    }
  }

  return {};
}