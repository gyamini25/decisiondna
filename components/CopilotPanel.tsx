"use client";

import { useState } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  text: string;
  matches?: { title: string; matchPct: number; id: string }[];
}

const SUGGESTIONS = [
  "Should we reduce customer support staffing?",
  "What's the risk of raising prices across all regions?",
  "Have we tried outsourcing support before?",
];

export function CopilotPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Ask me anything about past decisions — I answer from your organizational memory, grounded in cited precedent.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: d.answer ?? d.error ?? "No answer.", matches: d.matches }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-[420px] flex-col bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <Sparkles size={15} className="text-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">DecisionDNA Copilot</p>
              <p className="text-[10px] text-ink-soft">Grounded in organizational memory</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink"><X size={18} /></button>
        </div>

        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${m.role === "user" ? "bg-brand-600 text-white" : "border border-line bg-surface-2 text-ink"}`}>
                {m.text}
                {m.matches && m.matches.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-line pt-2">
                    {m.matches.map((mt) => (
                      <div key={mt.id} className="flex items-center justify-between text-[10px] text-ink-soft">
                        <span className="truncate">{mt.title}</span>
                        <span className="ml-2 font-semibold text-brand-400">{mt.matchPct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-[11px] text-ink-soft"><Loader2 size={13} className="animate-spin" /> Searching memory…</div>}
          {messages.length === 1 && (
            <div className="space-y-1.5 pt-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="block w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-left text-[11px] text-ink-soft hover:border-brand-400">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="Ask about a decision…"
            className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink outline-none focus:border-brand-400"
          />
          <button onClick={() => ask(input)} disabled={busy} className="rounded-lg bg-brand-600 p-2 text-white disabled:opacity-50">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
