import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMessages, sendMessage } from "../api/resources";
import { getRoleAccent } from "../roleTheme";

export default function ChatPanel({ open, interestId, counterpartName, onClose }) {
  const { user } = useAuth();
  const accent = getRoleAccent(user?.role);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!interestId) return;
    try {
      const data = await getMessages(interestId);
      setMessages(data);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Could not load messages.");
    }
  }, [interestId]);

  useEffect(() => {
    if (!open || !interestId) return;
    setLoading(true);
    setError("");
    load().finally(() => setLoading(false));

    // Light polling while the panel is open, same pattern as the
    // notification bell — cleaned up on close/unmount.
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [open, interestId, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setError("");
    try {
      await sendMessage(interestId, trimmed);
      setText("");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail ?? "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Chat with {counterpartName ?? "counterpart"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {loading && <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No messages yet — say hello.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? accent.button : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  <p>{m.text}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-5 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className={`flex items-center justify-center rounded-md px-3 py-2 disabled:opacity-60 ${accent.button}`}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
