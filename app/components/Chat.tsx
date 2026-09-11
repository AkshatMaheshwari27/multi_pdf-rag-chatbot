"use client";

import { useRef, useState, type FormEvent } from "react";
import type { ChatSource } from "@/lib/chat/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isError?: boolean;
}

let messageCounter = 0;
function makeId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || isLoading) {
      return;
    }

    setMessages((prev) => [...prev, { id: makeId(), role: "user", content: question }]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
      });

      const data: { answer?: string; sources?: ChatSource[]; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to get an answer.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: data.answer ?? "",
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-black/[.08] p-6 dark:border-white/[.145]">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Ask a question</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Answers are generated only from the documents you&apos;ve uploaded above.
        </p>
      </div>

      <div className="flex min-h-[12rem] max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-md bg-zinc-50 p-4 dark:bg-zinc-900">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No messages yet. Upload a PDF above, then ask something about it.
          </p>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-lg bg-foreground px-4 py-2 text-sm text-background"
                  : message.isError
                    ? "max-w-[85%] rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                    : "max-w-[85%] rounded-lg border border-black/[.08] bg-white px-4 py-2 text-sm text-zinc-800 dark:border-white/[.145] dark:bg-black dark:text-zinc-200"
              }
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.role === "assistant" && !message.isError && !!message.sources?.length && (
                <div className="mt-2 flex flex-col gap-1 border-t border-black/[.08] pt-2 dark:border-white/[.145]">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sources</p>
                  {message.sources.map((source) => (
                    <p key={source.chunkId} className="text-xs text-zinc-500 dark:text-zinc-400">
                      {source.filename}
                      {source.pageNumber !== null ? `, page ${source.pageNumber}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg border border-black/[.08] bg-white px-4 py-2 text-sm text-zinc-500 dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
              Thinking&hellip;
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question about your uploaded documents..."
          disabled={isLoading}
          className="flex-1 rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm text-black outline-none disabled:opacity-50 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
