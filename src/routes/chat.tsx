import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Temple Explorer AI · Sanjai's Travel AI" }, { name: "description", content: "Chat with your personal Temple Explorer AI." }] }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Suggest a 2-day trip from Chennai under ₹3000",
  "Hidden Shiva temples near Kanchipuram",
  "Best waterfalls in Tamil Nadu in monsoon",
  "Ancient temples I should visit before 30",
  "Plan a Murugan temple circuit",
];

function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || status === "streaming") return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-10 rounded-xl gradient-hero grid place-items-center"><Sparkles className="size-5 text-primary-foreground" /></div>
        <div>
          <div className="font-display text-lg font-semibold">Temple Explorer AI</div>
          <div className="text-xs text-muted-foreground">Your personal temple & travel guide</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="temple-card p-6">
            <div className="font-display text-lg font-semibold">Vanakkam Sanjai 🙏</div>
            <p className="text-sm text-muted-foreground mt-1">Ask me anything about temples, trips, hidden gems, or routes across Tamil Nadu and India.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(s)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts.filter((p) => p.type === "text").map((p) => ("text" in p ? p.text : "")).join("");
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                mine ? "gradient-hero text-primary-foreground" : "temple-card"
              }`}>
                {mine ? text : (
                  <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground prose-li:text-foreground">
                    <ReactMarkdown>{text || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {status === "streaming" && (
          <div className="flex justify-start"><div className="temple-card px-4 py-3 text-sm flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Thinking…</div></div>
        )}
        {error && <div className="text-sm text-destructive">Error: {error.message}</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about temples, trips, routes…"
          className="flex-1 h-12 rounded-xl bg-card border border-border px-4 outline-none focus:ring-2 focus:ring-primary"
        />
        <button disabled={status === "streaming" || !input.trim()} className="h-12 w-12 grid place-items-center rounded-xl gradient-hero text-primary-foreground disabled:opacity-50">
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
