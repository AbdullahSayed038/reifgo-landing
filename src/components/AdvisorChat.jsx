import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import "./AdvisorChat.css";

const CHIPS = ["Market Pulse: London", "Risk Assessment", "Portfolio Rebalance"];

// The rich "Institutional Insights" card (with the Marina Sands property
// listing) is the seeded first reply. Anything the visitor sends after that
// gets a plain acknowledgement bubble — there's no live model wired up yet.
const PLACEHOLDER_REPLY =
  "Thanks for your message — REIFGO Advisor's live market intelligence is being connected. A full AI-generated response will appear here soon.";

const INITIAL_MESSAGES = [
  {
    id: "seed-user",
    role: "user",
    text: "AI Advisor, identify the best ROI projects in Dubai Marina currently available for institutional entry. Focus on waterfront developments with proven rental yields.",
  },
  { id: "seed-ai", role: "ai", card: true },
];

export default function AdvisorChat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const spaceRef = useRef(null);

  useEffect(() => {
    const el = spaceRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: trimmed }]);
    setInput("");
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "ai", text: PLACEHOLDER_REPLY }]);
    }, 700);
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <section className="achat">
      <div className="achat__space" ref={spaceRef}>
        <div className="achat__thread">
          {messages.map((m) => {
            if (m.role === "user") {
              return (
                <div className="achat__user" key={m.id}>
                  <div className="achat__bubble">{m.text}</div>
                </div>
              );
            }

            if (m.card) {
              return (
                <div className="achat__ai" data-reveal style={{ "--reveal-delay": "0.1s" }} key={m.id}>
                  <div className="achat__card">
                    <div className="achat__card-head">
                      <Icon name="barChart" size={18} />
                      <span>Institutional Insights</span>
                    </div>

                    <p className="achat__card-text">
                      Based on current market dynamics and capital flow analysis, Dubai
                      Marina continues to show strong appreciation in the ultra-luxury
                      segment. Institutional interest has pivoted toward "The Marina
                      Sands" and "Cove Residences" due to their unique architectural
                      positioning and high occupancy rates (94%+).
                    </p>

                    <article className="achat__prop">
                      <div className="achat__prop-media">
                        <img src="/marina-sands.png" alt="Marina Sands Residences towers" />
                        <span className="achat__prop-badge">Prime ROI</span>
                      </div>
                      <div className="achat__prop-info">
                        <div className="achat__prop-top">
                          <h3 className="achat__prop-title">Marina Sands Residences</h3>
                          <span className="achat__prop-loc">
                            <Icon name="pin" size={12} />
                            Dubai Marina, UAE
                          </span>
                        </div>
                        <div className="achat__prop-stats">
                          <div className="achat__stat">
                            <span className="achat__stat-label">Projected Yield</span>
                            <span className="achat__stat-value">8.4% Net</span>
                          </div>
                          <div className="achat__stat">
                            <span className="achat__stat-label">Entry Point</span>
                            <span className="achat__stat-value">$1.2M USD</span>
                          </div>
                        </div>
                        <a href="#" className="achat__prop-link">
                          View Data Deck
                          <Icon name="chevronRight" size={12} />
                        </a>
                      </div>
                    </article>

                    <blockquote className="achat__quote">
                      "Institutional data suggests a secondary market surge in the next
                      14 months for 3-bedroom configurations."
                    </blockquote>
                  </div>
                </div>
              );
            }

            return (
              <div className="achat__ai" key={m.id}>
                <div className="achat__card achat__card--simple">
                  <div className="achat__card-head">
                    <Icon name="barChart" size={18} />
                    <span>Advisor AI</span>
                  </div>
                  <p className="achat__card-text">{m.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="achat__input">
        {/* Mobile-only: preset prompts live behind this icon instead of a
            horizontally-scrolling chip row. Desktop keeps the chip row. */}
        {suggestOpen && (
          <div className="achat__suggest-scrim" onClick={() => setSuggestOpen(false)} />
        )}
        <div className="achat__composer">
          <div className="achat__suggest">
            <button
              type="button"
              className="achat__suggest-btn"
              aria-label="Suggested prompts"
              aria-expanded={suggestOpen}
              onClick={() => setSuggestOpen((v) => !v)}
            >
              <Icon name="bulb" size={18} />
            </button>
            {suggestOpen && (
              <div className="achat__suggest-menu">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="achat__suggest-item"
                    onClick={() => {
                      send(c);
                      setSuggestOpen(false);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="achat__field" onSubmit={handleSubmit}>
            <input
              type="text"
              className="achat__textbox"
              placeholder="Ask REIFGO Advisor about global portfolio strategies..."
              aria-label="Ask REIFGO Advisor"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="achat__send" aria-label="Send">
              <Icon name="send" size={19} />
            </button>
          </form>
        </div>

        <div className="achat__chips">
          {CHIPS.map((c) => (
            <button key={c} type="button" className="achat__chip" onClick={() => send(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
