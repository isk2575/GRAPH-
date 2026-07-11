import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send, Loader2, Lock } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import { sendCoachChat, type ChatMessage } from "../lib/coachApi";

export default function CoachChat({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { profile } = useUser();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your GRAPH Coach. Ask me anything about your credit, your missions, or getting mortgage-ready.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !user) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      // Skip the canned greeting when sending history to the model.
      const forApi = nextMessages.filter(
        (m, i) => !(i === 0 && m.role === "assistant")
      );
      const reply = await sendCoachChat(forApi, profile);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I couldn't reach the coach service. Make sure the backend is running and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-[#0F0F11]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E50914] text-sm font-black text-white">
              G
            </div>
            <div>
              <p className="text-sm font-bold text-white">GRAPH Coach</p>
              <p className="text-xs text-white/45">AI credit assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#E50914] text-white"
                    : "border border-white/[0.08] bg-[#161618] text-white/85"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#161618] px-4 py-2.5 text-sm text-white/50">
                <Loader2 size={14} className="animate-spin" />
                Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Input — or the login gate */}
        <div className="border-t border-white/[0.08] p-4">
          {user ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 focus-within:border-[#E50914]/50">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="Ask about your credit…"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="rounded-xl bg-[#E50914] p-2 text-white transition hover:bg-[#c90812] disabled:opacity-30"
              >
                <Send size={16} />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E50914]/25 bg-[#E50914]/[0.06] p-4 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#E50914]/[0.14] text-[#E50914]">
                <Lock size={16} />
              </div>
              <p className="text-sm font-semibold text-white">
                Please log in to continue.
              </p>
              <p className="mt-1 text-xs text-white/50">
                Your coach needs your profile to give you real advice.
              </p>
              <button
                onClick={() =>
                  navigate("/login", {
                    state: { notice: "Please log in to talk to your coach." },
                  })
                }
                className="mt-4 w-full rounded-full bg-[#E50914] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#c90812]"
              >
                Log in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}