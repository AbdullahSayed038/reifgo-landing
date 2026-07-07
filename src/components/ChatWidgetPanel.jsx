import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

const GREETING = {
  role: "assistant",
  content:
    "Hi — I'm REIFGO's assistant. Ask me about the platform, investments, developers, events, or our services.",
};

export default function ChatWidgetPanel({ open, onClose }) {
  // Conversation lives in component state only — nothing is persisted.
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [lastFailed, setLastFailed] = useState(null);
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text, priorMessages) {
    const trimmed = text.trim();
    if (!trimmed || status === "sending") return;

    // History sent to the API excludes the canned greeting.
    const history = priorMessages
      .filter((m) => m !== GREETING)
      .map(({ role, content }) => ({ role, content }));

    setMessages([...priorMessages, { role: "user", content: trimmed }]);
    setInput("");
    setStatus("sending");
    setLastFailed(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.resetConversation) {
          setMessages([GREETING, { role: "assistant", content: data.error }]);
          setStatus("idle");
          return;
        }
        throw new Error(data.error || "Request failed");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setStatus("idle");
    } catch (err) {
      setLastFailed({ text: trimmed, prior: priorMessages, message: err.message });
      setStatus("error");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input, messages);
  }

  function retry() {
    if (lastFailed) send(lastFailed.text, lastFailed.prior);
  }

  return (
    <section
      className="cw__panel"
      data-open={open}
      role="dialog"
      aria-label="REIFGO assistant"
      aria-hidden={!open}
    >
      <header className="cw__head">
        <div className="cw__head-title">
          <Icon name="chat" size={18} />
          <span>REIFGO Assistant</span>
        </div>
        <button type="button" className="cw__close" aria-label="Close chat" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="cw__thread" ref={threadRef}>
        {messages.map((m, i) => (
          <div key={i} className={`cw__msg cw__msg--${m.role}`}>
            {m.content}
          </div>
        ))}

        {status === "sending" && (
          <div className="cw__msg cw__msg--assistant cw__typing" aria-label="Assistant is typing">
            <span />
            <span />
            <span />
          </div>
        )}

        {status === "error" && (
          <div className="cw__error">
            <p>{lastFailed?.message || "Sorry, that didn't go through."}</p>
            <button type="button" className="cw__retry" onClick={retry}>
              Try again
            </button>
          </div>
        )}
      </div>

      <form className="cw__composer" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="cw__input"
          placeholder="Ask about REIFGO..."
          aria-label="Ask about REIFGO"
          maxLength={500}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status === "sending"}
        />
        <button
          type="submit"
          className="cw__send"
          aria-label="Send"
          disabled={status === "sending" || !input.trim()}
        >
          <Icon name="send" size={17} />
        </button>
      </form>

      <p className="cw__disclaimer">
        Powered by AI — answers are informational, not investment advice.
      </p>
    </section>
  );
}
