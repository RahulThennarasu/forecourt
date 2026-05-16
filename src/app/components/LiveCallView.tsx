import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Plane, BedDouble, Utensils, MapPin } from "lucide-react";

const SCRIPT = [
  { role: "guest",      text: "Hello, I'm calling about my reservation this evening.",                                                               delay: 1000  },
  { role: "concierge",  text: "Good afternoon, Mr. Tanaka. Welcome back. I see you're arriving from Tokyo on UA241.",                                delay: 4000  },
  { role: "guest",      text: "Yes, that's right. It's our anniversary weekend.",                                                                    delay: 9000  },
  { role: "concierge",  text: "How wonderful. Congratulations — I've noted that and prepared something special for your arrival.",                   delay: 13500 },
  { role: "guest",      text: "We'd love a quiet table at Madera around 7pm if possible.",                                                           delay: 18500 },
  { role: "concierge",  text: "Of course. I've reserved a corner table on the patio for 7pm with your preferred Sancerre chilled and ready.",        delay: 23000 },
] as const;

const PROFILE_REVEALS: { delay: number; field: string }[] = [
  { delay: 4500,  field: "identity"   },
  { delay: 5000,  field: "flight"     },
  { delay: 9500,  field: "notable"    },
  { delay: 14000, field: "past"       },
  { delay: 19000, field: "dining"     },
  { delay: 23500, field: "room"       },
];

const ACTIONS: { delay: number; text: string; category: string }[] = [
  { delay: 4200,  category: "identity",    text: "Caller identified: Mr. Tanaka"        },
  { delay: 5200,  category: "flight",      text: "UA241 · HND → SFO · ETA 4:32 PM"     },
  { delay: 9800,  category: "occasion",    text: "Anniversary weekend flagged"           },
  { delay: 10200, category: "suite",       text: "Corner suite, oak view requested"     },
  { delay: 14200, category: "experience",  text: "Anniversary experience triggered"     },
  { delay: 19200, category: "dining",      text: "Quiet seating preference noted"       },
  { delay: 23600, category: "reservation", text: "Madera patio · 7:00 PM reserved"     },
  { delay: 24200, category: "wine",        text: "Sancerre Loire Valley 2021 chilled"   },
  { delay: 25000, category: "amenity",     text: "Welcome amenity prepared"             },
];

const CATEGORY_COLOR: Record<string, string> = {
  identity:    "#1B3A2D",
  flight:      "#4A6FA5",
  occasion:    "#7A4A6B",
  suite:       "#1B3A2D",
  experience:  "#7A4A6B",
  dining:      "#A07850",
  reservation: "#A07850",
  wine:        "#7A3B3B",
  amenity:     "#4A8C5C",
};

const CATEGORY_BG: Record<string, string> = {
  identity:    "#EAF0EB",
  flight:      "#E5EBF5",
  occasion:    "#F2E8EF",
  suite:       "#EAF0EB",
  experience:  "#F2E8EF",
  dining:      "#F5EFE6",
  reservation: "#F5EFE6",
  wine:        "#F5EAEA",
  amenity:     "#EAF0EB",
};

export function LiveCallView() {
  const [messages,  setMessages]  = useState<typeof SCRIPT[number][]>([]);
  const [revealed,  setRevealed]  = useState<Set<string>>(new Set());
  const [actions,   setActions]   = useState<typeof ACTIONS[number][]>([]);
  const [speaking,  setSpeaking]  = useState(false);
  const [callTime,  setCallTime]  = useState(0);
  const [started,   setStarted]   = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setCallTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    SCRIPT.forEach(msg => {
      timers.push(setTimeout(() => {
        setMessages(prev => [...prev, msg]);
        if (msg.role === "concierge") {
          setSpeaking(true);
          setTimeout(() => setSpeaking(false), 2200);
        }
        setTimeout(() => {
          chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
        }, 60);
      }, msg.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    PROFILE_REVEALS.forEach(({ delay, field }) => {
      timers.push(setTimeout(() => setRevealed(prev => new Set([...prev, field])), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    ACTIONS.forEach(action => {
      timers.push(setTimeout(() => setActions(prev => [action, ...prev]), action.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [started]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="h-full overflow-hidden flex flex-col">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 border-b border-[#EAE6E0]" style={{ height: 64 }}>
        <div className="flex items-center gap-2.5" style={{ minWidth: 160 }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4A8C5C" }}
          />
          <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: "#999", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            In Call
          </span>
          {started && (
            <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: "#C8C3BA" }}>
              · {fmt(callTime)}
            </span>
          )}
        </div>

        <div className="flex-1 flex justify-center">
          <AnimatePresence mode="wait">
            {revealed.has("identity") ? (
              <motion.div key="name" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="text-center">
                <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.25rem", fontWeight: 300, color: "#1A1814", lineHeight: 1 }}>
                  Mr. & Mrs. Tanaka
                </p>
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5625rem", color: "#C0BAB0", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 5 }}>
                  Corner Suite{revealed.has("notable") ? " · Anniversary Weekend" : ""}
                </p>
              </motion.div>
            ) : (
              <motion.p key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: "#DDD", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Identifying caller…
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 justify-end" style={{ minWidth: 160 }}>
          <Phone className="w-3 h-3" style={{ color: "#D0CBC0", strokeWidth: 1.5 }} />
          <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#C8C3BA" }}>
            +1 (415) 555-0182
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* Chat — full area with right clearance for the panel */}
        <div
          ref={chatRef}
          className="h-full overflow-y-auto"
          style={{ paddingTop: 44, paddingBottom: 44, paddingLeft: 72, paddingRight: 316, scrollbarWidth: "none" }}
        >
          <div className="space-y-6">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                  className={`flex flex-col ${msg.role === "guest" ? "items-end" : "items-start"}`}
                >
                  <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5rem", color: "#CCC", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>
                    {msg.role === "guest" ? "Guest" : "Concierge AI"}
                  </span>
                  <div style={{
                    maxWidth: "78%",
                    background: msg.role === "guest" ? "#F5F3EE" : "#1B3A2D",
                    borderRadius: msg.role === "guest" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "15px 20px",
                  }}>
                    <p style={{
                      fontFamily: "General Sans, sans-serif", fontSize: "0.9375rem",
                      color: msg.role === "guest" ? "#1A1814" : "#EEE9E2",
                      lineHeight: 1.65,
                    }}>
                      {msg.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {speaking && (
                <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-start">
                  <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5rem", color: "#CCC", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>
                    Concierge AI
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-5 py-4" style={{ background: "#1B3A2D", borderRadius: "18px 18px 18px 4px" }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.35)" }}
                        animate={{ scale: [1, 1.8, 1] }}
                        transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.16 }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {messages.length === 0 && !speaking && (
              <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.875rem", color: "#DDD" }}>Connecting…</p>
            )}
          </div>
        </div>

        {/* ── Floating right panel: guest card + actions, unified, scrollable ── */}
        <div
          className="absolute overflow-y-auto"
          style={{
            top: 20, right: 20, bottom: 20, width: 264,
            scrollbarWidth: "none",
          }}
        >
          {/* Guest profile card */}
          <AnimatePresence>
            {revealed.has("identity") && (
              <motion.div
                key="guest-card"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="rounded-2xl overflow-hidden mb-3"
                style={{
                  background: "#fff",
                  border: "1px solid #EAE6E0",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
                }}
              >
                {/* Identity */}
                <div className="px-5 pt-5 pb-4 flex items-center gap-3" style={{ borderBottom: "1px solid #F2F0EB" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#1B3A2D" }}>
                    <span style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.125rem", color: "#fff", fontWeight: 300, lineHeight: 1 }}>T</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.0625rem", fontWeight: 300, color: "#1A1814", lineHeight: 1.1, marginBottom: 3 }}>
                      Mr. & Mrs. Tanaka
                    </p>
                    <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5625rem", color: "#BBB", letterSpacing: "0.05em" }}>
                      Corner Suite · Returning Guest
                    </p>
                  </div>
                </div>

                {/* Progressive reveals */}
                <div className="px-5 py-4 space-y-4">
                  <AnimatePresence>
                    {revealed.has("flight") && (
                      <motion.div key="flight" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "#F7F5F0" }}>
                        <Plane className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#4A6FA5", strokeWidth: 1.5 }} />
                        <div>
                          <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#1A1814" }}>UA241 · HND → SFO</p>
                          <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: "#AAA", marginTop: 1 }}>ETA 4:32 PM PT</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {revealed.has("past") && (
                      <motion.div key="past" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#C8C3BA", marginBottom: 8 }}>
                          History
                        </p>
                        <div className="space-y-2 pl-3" style={{ borderLeft: "1px solid #E8E4DA" }}>
                          {[
                            { date: "Sept 2023", label: "Engagement weekend" },
                            { date: "Mar 2024",  label: "Business trip" },
                          ].map((s, i) => (
                            <div key={i}>
                              <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5625rem", color: "#C0BAB0" }}>{s.date} · </span>
                              <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5625rem", color: "#666" }}>{s.label}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {revealed.has("dining") && (
                      <motion.div key="prefs" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-2.5">
                        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#C8C3BA", marginBottom: 8 }}>
                          Preferences
                        </p>
                        <div className="flex items-start gap-2">
                          <Utensils className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#C8C3BA", strokeWidth: 1.5 }} />
                          <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#555", lineHeight: 1.5 }}>Vegetarian, Sancerre, quiet seating</p>
                        </div>
                        {revealed.has("room") && (
                          <>
                            <div className="flex items-start gap-2">
                              <BedDouble className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#C8C3BA", strokeWidth: 1.5 }} />
                              <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#555", lineHeight: 1.5 }}>~68°F, extra duvet</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#C8C3BA", strokeWidth: 1.5 }} />
                              <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#555", lineHeight: 1.5 }}>Tokyo · Wine, tennis</p>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions — appear below the guest card, stack naturally */}
          <div className="space-y-2">
            <AnimatePresence>
              {actions.map((action, i) => (
                <motion.div
                  key={`${action.text}-${i}`}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{
                    background: CATEGORY_BG[action.category] ?? "#F5F3EE",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLOR[action.category] ?? "#AAA" }} />
                  <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#1A1814", lineHeight: 1.4 }}>
                    {action.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
