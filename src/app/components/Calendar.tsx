import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type View = "month" | "week" | "day";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "vip" | "stay" | "dining" | "spa";
  detail?: string;
  startHour?: number;
  endHour?: number;
}

interface TooltipState {
  event: CalEvent;
  x: number;
  y: number;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const EVENT_STYLES: Record<CalEvent["type"], { bg: string; text: string; dot: string; label: string }> = {
  vip:    { bg: "#1B3A2D", text: "#FFFFFF", dot: "#1B3A2D", label: "VIP Stay"  },
  stay:   { bg: "#DCE8DE", text: "#1B3A2D", dot: "#4A8C5C", label: "Stay"      },
  dining: { bg: "#F2ECE3", text: "#6B4F35", dot: "#A07850", label: "Dining"    },
  spa:    { bg: "#E8E9F2", text: "#3A3D6B", dot: "#5A5EA0", label: "Spa"       },
};

// All events: those with startHour are timed; those without are all-day/multi-day
const EVENTS: CalEvent[] = [
  // Multi-day / all-day stays
  { id: "e1",  title: "Harrington VIP Suite",   start: "2026-05-07", end: "2026-05-10", type: "vip",    detail: "Board retreat · VIP Suite" },
  { id: "e2",  title: "Chen — Spa Retreat",     start: "2026-05-12", end: "2026-05-14", type: "spa",    detail: "Spa Suite · Wellness retreat" },
  { id: "e3",  title: "Williams Family Stay",   start: "2026-05-14", end: "2026-05-17", type: "stay",   detail: "Garden Villa · Annual family stay" },
  { id: "e4",  title: "Tanaka — Anniversary",   start: "2026-05-16", end: "2026-05-18", type: "vip",    detail: "Corner Suite · Anniversary weekend" },
  { id: "e6",  title: "Sense Spa Block",        start: "2026-05-19", end: "2026-05-20", type: "spa",    detail: "Morning treatments reserved" },
  { id: "e7",  title: "Park — Garden Suite",    start: "2026-05-22", end: "2026-05-25", type: "stay",   detail: "Garden Suite · First visit" },
  { id: "e8",  title: "Memorial Day House",     start: "2026-05-25", end: "2026-05-27", type: "stay",   detail: "Full property · Holiday weekend" },
  { id: "e9",  title: "Hendricks Arrival",      start: "2026-05-30", end: "2026-06-01", type: "stay",   detail: "Deluxe Room · Late arrival" },
  // Timed events (single-day, shown in time grid on week view)
  { id: "e10", title: "Harrington Check-in",    start: "2026-05-07", end: "2026-05-07", type: "vip",    detail: "VIP Suite · Board retreat", startHour: 15, endHour: 16 },
  { id: "e11", title: "Chen Spa Treatment",     start: "2026-05-13", end: "2026-05-13", type: "spa",    detail: "Sense Spa · Morning session", startHour: 9, endHour: 11 },
  { id: "e12", title: "Tanaka Arrival",         start: "2026-05-16", end: "2026-05-16", type: "vip",    detail: "Corner Suite · ETA 4:32 PM", startHour: 17, endHour: 18 },
  { id: "e5",  title: "Madera Dinner",          start: "2026-05-16", end: "2026-05-16", type: "dining", detail: "Patio table · Sancerre reserved", startHour: 19, endHour: 21 },
  { id: "e13", title: "Sense Spa Morning",      start: "2026-05-19", end: "2026-05-19", type: "spa",    detail: "Treatment block · 3 hours", startHour: 9, endHour: 12 },
  { id: "e14", title: "Park Check-in",          start: "2026-05-22", end: "2026-05-22", type: "stay",   detail: "Garden Suite · First visit", startHour: 15, endHour: 16 },
  { id: "e15", title: "Hendricks Late Arrival", start: "2026-05-30", end: "2026-05-30", type: "stay",   detail: "Deluxe Room · Late arrival", startHour: 22, endHour: 23 },
];

const ALL_DAY_EVENTS = EVENTS.filter(ev => ev.startHour === undefined);
const TIMED_EVENTS   = EVENTS.filter(ev => ev.startHour !== undefined);

function toDate(s: string) { return new Date(s + "T12:00:00"); }

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateRange(start: string, end: string) {
  const s = toDate(start), e = toDate(end);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (start === end) return fmt(s);
  const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
  return `${fmt(s)} – ${fmt(e)} · ${nights} night${nights !== 1 ? "s" : ""}`;
}

function fmtHour(h: number) {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

const TODAY_KEY = dateKey(new Date());

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

function buildMonthWeeks(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

interface PlacedEvent extends CalEvent {
  startCol: number; endCol: number; row: number;
  continuesLeft: boolean; continuesRight: boolean;
}

function placeEventsForDays(days: (Date | null)[], maxRows = 3, eventsArr = ALL_DAY_EVENTS): PlacedEvent[] {
  const placed: PlacedEvent[] = [];
  const slotUsage: Array<Array<{ s: number; e: number }>> = Array.from({ length: maxRows }, () => []);
  eventsArr.forEach(ev => {
    const evStart = toDate(ev.start), evEnd = toDate(ev.end);
    let startCol = -1, endCol = -1;
    days.forEach((day, col) => {
      if (!day) return;
      const d = new Date(day); d.setHours(12, 0, 0, 0);
      if (d >= evStart && d <= evEnd) { if (startCol === -1) startCol = col; endCol = col; }
    });
    if (startCol === -1) return;
    let row = -1;
    for (let r = 0; r < maxRows; r++) {
      if (!slotUsage[r].some(u => !(u.e < startCol || u.s > endCol))) { row = r; break; }
    }
    if (row === -1) return;
    slotUsage[row].push({ s: startCol, e: endCol });
    const firstDay = days.find(d => d !== null)!;
    const lastDay = [...days].reverse().find(d => d !== null)!;
    const fDate = new Date(firstDay); fDate.setHours(12);
    const lDate = new Date(lastDay); lDate.setHours(12);
    placed.push({ ...ev, startCol, endCol, row, continuesLeft: evStart < fDate, continuesRight: evEnd > lDate });
  });
  return placed;
}

function getEventsForDay(date: Date): CalEvent[] {
  const d = new Date(date); d.setHours(12, 0, 0, 0);
  return EVENTS.filter(ev => d >= toDate(ev.start) && d <= toDate(ev.end));
}

// ── Tooltip ─────────────────────────────────────────────────────────────────
function EventTooltip({ tooltip }: { tooltip: TooltipState }) {
  const s = EVENT_STYLES[tooltip.event.type];
  const OFFSET = 12;
  const x = Math.min(tooltip.x + OFFSET, window.innerWidth - 260);
  const y = tooltip.y - 8;

  return (
    <AnimatePresence>
      <motion.div
        key={tooltip.event.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed z-50 pointer-events-none"
        style={{ left: x, top: y, transform: "translateY(-100%)" }}
      >
        <div className="bg-white border border-[#E8E4DA] shadow-lg rounded-lg px-4 py-3" style={{ minWidth: 200, maxWidth: 248 }}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
            <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: "#AAA", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {s.label}
            </span>
          </div>
          <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1rem", fontWeight: 400, color: "#1A1814", lineHeight: 1.3, marginBottom: 6 }}>
            {tooltip.event.title}
          </p>
          {tooltip.event.startHour !== undefined ? (
            <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#888" }}>
              {fmtHour(tooltip.event.startHour)} – {fmtHour(tooltip.event.endHour!)}
            </p>
          ) : (
            <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#888" }}>
              {formatDateRange(tooltip.event.start, tooltip.event.end)}
            </p>
          )}
          {tooltip.event.detail && (
            <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#AAA", marginTop: 3 }}>
              {tooltip.event.detail}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── EventBar (for all-day spanning bars) ─────────────────────────────────────
function EventBar({ ev, startCol, endCol, row, continuesLeft, continuesRight, totalCols, rowH, topOffset, onHover, onLeave }: {
  ev: CalEvent; startCol: number; endCol: number; row: number;
  continuesLeft: boolean; continuesRight: boolean;
  totalCols: number; rowH: number; topOffset: number;
  onHover: (ev: CalEvent, x: number, y: number) => void;
  onLeave: () => void;
}) {
  const s = EVENT_STYLES[ev.type];
  const PAD = 3;
  const leftPx = continuesLeft ? 0 : PAD;
  const rightPx = continuesRight ? 0 : PAD;

  return (
    <div
      className="absolute flex items-center overflow-hidden cursor-pointer"
      onMouseEnter={e => onHover(ev, e.clientX, e.clientY)}
      onMouseLeave={onLeave}
      style={{
        left: `calc(${(startCol / totalCols) * 100}% + ${leftPx}px)`,
        width: `calc(${((endCol - startCol + 1) / totalCols) * 100}% - ${leftPx + rightPx}px + ${continuesRight ? 1 : 0}px)`,
        top: topOffset + row * rowH,
        height: rowH - 4,
        background: s.bg,
        borderRadius: continuesLeft && continuesRight ? 0
          : continuesLeft  ? "0 4px 4px 0"
          : continuesRight ? "4px 0 0 4px"
          : 4,
        paddingLeft: continuesLeft ? 6 : 8,
        paddingRight: 6,
        zIndex: 10,
        transition: "opacity 0.15s",
      }}
    >
      <span className="truncate" style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: s.text, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
        {ev.title}
      </span>
    </div>
  );
}

function ColLines({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={i < count - 1 ? "border-r border-[#E8E4DA]" : ""} />
      ))}
    </div>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────
export function Calendar() {
  const [view, setView]           = useState<View>("month");
  const [focusDate, setFocusDate] = useState(new Date(2026, 4, 16));
  const [selected, setSelected]   = useState("2026-05-16");
  const [dir, setDir]             = useState(1);
  const [tooltip, setTooltip]     = useState<TooltipState | null>(null);

  const handleHover = useCallback((ev: CalEvent, x: number, y: number) => {
    setTooltip({ event: ev, x, y });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  function navigate(delta: number) {
    setDir(delta);
    const d = new Date(focusDate);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    if (view === "week")  d.setDate(d.getDate() + delta * 7);
    if (view === "day")   d.setDate(d.getDate() + delta);
    setFocusDate(d);
  }

  function goToday() {
    setDir(0); const t = new Date(); setFocusDate(t); setSelected(dateKey(t));
  }

  function selectDay(date: Date) {
    setSelected(dateKey(date)); setFocusDate(new Date(date));
  }

  const title = (() => {
    if (view === "month") return `${MONTHS[focusDate.getMonth()]} ${focusDate.getFullYear()}`;
    if (view === "week") {
      const [s, e] = [getWeekDays(focusDate)[0], getWeekDays(focusDate)[6]];
      return s.getMonth() === e.getMonth()
        ? `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`
        : `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return `${DAY_NAMES[focusDate.getDay()]}, ${MONTHS[focusDate.getMonth()]} ${focusDate.getDate()}`;
  })();

  const MONTH_ROW_H = 24;
  const MONTH_DATE_H = 36;
  const MONTH_CELL_H = MONTH_DATE_H + MONTH_ROW_H * 3 + 8;

  function DayNumber({ date, dim }: { date: Date; dim?: boolean }) {
    const k = dateKey(date);
    const isTod = k === TODAY_KEY, isSel = k === selected;
    return (
      <span className="w-6 h-6 flex items-center justify-center rounded-full"
        style={{
          fontFamily: "General Sans, sans-serif", fontSize: "0.75rem",
          background: isSel ? "#1B3A2D" : "transparent",
          color: isSel ? "#fff" : isTod ? "#1B3A2D" : dim ? "#CCC" : "#555",
          border: isTod && !isSel ? "1px solid #1B3A2D" : "none",
        }}>
        {date.getDate()}
      </span>
    );
  }

  // ── Month view ──────────────────────────────────────────────────────────
  function MonthView() {
    const weeks = buildMonthWeeks(focusDate.getFullYear(), focusDate.getMonth());
    // For month view show all events (timed ones appear as single-day bars)
    const allForMonth = EVENTS;
    return (
      <div className="flex-1 border border-[#E8E4DA] overflow-hidden" style={{ borderRadius: 8 }}>
        <div className="grid grid-cols-7 border-b border-[#E8E4DA]">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`py-3 text-center ${i < 6 ? "border-r border-[#E8E4DA]" : ""}`}
              style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA" }}>
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => {
          const placed = placeEventsForDays(week, 3, allForMonth);
          return (
            <div key={wi} className={`relative grid grid-cols-7 ${wi < weeks.length - 1 ? "border-b border-[#E8E4DA]" : ""}`}
              style={{ height: MONTH_CELL_H }}>
              {week.map((date, col) => (
                <div key={col}
                  onClick={() => date && selectDay(date)}
                  className={`relative h-full ${col < 6 ? "border-r border-[#E8E4DA]" : ""} ${date ? "cursor-pointer hover:bg-[#FAFAF7]" : ""} transition-colors`}>
                  {date && (
                    <div className="flex justify-end px-2.5 pt-2.5">
                      <DayNumber date={date} dim={date.getMonth() !== focusDate.getMonth()} />
                    </div>
                  )}
                </div>
              ))}
              {placed.map(ev => (
                <EventBar key={`${ev.id}-w${wi}`} ev={ev}
                  startCol={ev.startCol} endCol={ev.endCol} row={ev.row}
                  continuesLeft={ev.continuesLeft} continuesRight={ev.continuesRight}
                  totalCols={7} rowH={MONTH_ROW_H} topOffset={MONTH_DATE_H}
                  onHover={handleHover} onLeave={handleLeave} />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Week view ───────────────────────────────────────────────────────────
  function WeekView() {
    const GUTTER_W = 52;
    const HOUR_H   = 60;
    const ALL_DAY_ROW_H = 28;

    const days = getWeekDays(focusDate);
    const weekKeys = new Set(days.map(d => dateKey(d)));

    // All-day spanning bars
    const placed = placeEventsForDays(days, 3, ALL_DAY_EVENTS);
    const maxAllDayRow = placed.reduce((m, ev) => Math.max(m, ev.row), -1);
    const allDayRows = Math.max(1, maxAllDayRow + 1);
    const allDayAreaH = allDayRows * ALL_DAY_ROW_H + 16;

    // Timed events this week
    const timedInWeek = TIMED_EVENTS.filter(ev => weekKeys.has(ev.start));

    // Auto hour range — expand/contract based on what's booked
    let firstHour = 8, lastHour = 18;
    if (timedInWeek.length > 0) {
      firstHour = Math.max(6, Math.floor(Math.min(...timedInWeek.map(ev => ev.startHour!))) - 1);
      lastHour  = Math.min(24, Math.ceil(Math.max(...timedInWeek.map(ev => ev.endHour!))) + 1);
    }
    const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);

    // Group timed events per day (to handle same-day overlap side-by-side)
    const timedByDay: Record<string, CalEvent[]> = {};
    timedInWeek.forEach(ev => {
      if (!timedByDay[ev.start]) timedByDay[ev.start] = [];
      timedByDay[ev.start].push(ev);
    });

    return (
      <div className="flex-1 flex flex-col border border-[#E8E4DA] overflow-hidden" style={{ borderRadius: 8 }}>

        {/* Day headers */}
        <div className="flex-shrink-0 border-b border-[#E8E4DA]" style={{ display: "grid", gridTemplateColumns: `${GUTTER_W}px repeat(7, 1fr)` }}>
          <div className="border-r border-[#E8E4DA]" />
          {days.map((date, i) => {
            const k = dateKey(date), isTod = k === TODAY_KEY, isSel = k === selected;
            return (
              <div key={i} onClick={() => selectDay(date)}
                className={`py-4 text-center cursor-pointer hover:bg-[#FAFAF7] transition-colors ${i < 6 ? "border-r border-[#E8E4DA]" : ""}`}>
                <div style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 6 }}>
                  {DAY_LABELS[i]}
                </div>
                <div className="flex justify-center">
                  <span className="w-9 h-9 flex items-center justify-center rounded-full"
                    style={{
                      fontFamily: "General Sans, sans-serif", fontSize: "1.0625rem",
                      background: isSel ? "#1B3A2D" : "transparent",
                      color: isSel ? "#fff" : isTod ? "#1B3A2D" : "#1A1814",
                      border: isTod && !isSel ? "1px solid #1B3A2D" : "none",
                    }}>
                    {date.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        <div className="flex-shrink-0 border-b border-[#E8E4DA]" style={{ height: allDayAreaH, display: "grid", gridTemplateColumns: `${GUTTER_W}px 1fr` }}>
          <div className="border-r border-[#E8E4DA] flex items-start justify-center pt-2.5">
            <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#CCC" }}>
              all day
            </span>
          </div>
          <div className="relative overflow-hidden">
            <ColLines count={7} />
            {placed.map(ev => (
              <EventBar key={ev.id} ev={ev}
                startCol={ev.startCol} endCol={ev.endCol} row={ev.row}
                continuesLeft={ev.continuesLeft} continuesRight={ev.continuesRight}
                totalCols={7} rowH={ALL_DAY_ROW_H} topOffset={8}
                onHover={handleHover} onLeave={handleLeave} />
            ))}
          </div>
        </div>

        {/* Scrollable time grid */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex" style={{ height: hours.length * HOUR_H }}>

            {/* Time gutter */}
            <div className="flex-shrink-0 border-r border-[#E8E4DA]" style={{ width: GUTTER_W }}>
              {hours.map((h, i) => (
                <div key={h} style={{ height: HOUR_H, position: "relative" }}>
                  {i > 0 && (
                    <span style={{
                      position: "absolute", top: -8, right: 10,
                      fontFamily: "General Sans, sans-serif", fontSize: "0.5625rem",
                      color: "#C0BAB0", letterSpacing: "0.04em", whiteSpace: "nowrap",
                    }}>
                      {fmtHour(h)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid columns + events */}
            <div className="flex-1 relative">
              {/* Hour lines */}
              {hours.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top: i * HOUR_H,
                    borderTop: `1px solid ${i === 0 ? "transparent" : "#F0EDE8"}`,
                  }} />
              ))}

              {/* Column dividers */}
              <ColLines count={7} />

              {/* Timed events */}
              {days.map((day, colIdx) => {
                const k = dateKey(day);
                const dayEvents = timedByDay[k] ?? [];
                const colW = 100 / 7;

                return dayEvents.map((ev, evIdx) => {
                  const totalInCol = dayEvents.length;
                  const evW = (colW / totalInCol);
                  const left = colW * colIdx + evW * evIdx;
                  const top = (ev.startHour! - firstHour) * HOUR_H;
                  const height = (ev.endHour! - ev.startHour!) * HOUR_H;
                  const s = EVENT_STYLES[ev.type];

                  return (
                    <div key={ev.id}
                      className="absolute overflow-hidden cursor-pointer"
                      onMouseEnter={e => handleHover(ev, e.clientX, e.clientY)}
                      onMouseLeave={handleLeave}
                      style={{
                        left: `calc(${left}% + 4px)`,
                        width: `calc(${evW}% - 8px)`,
                        top: top + 2,
                        height: height - 4,
                        background: s.bg,
                        borderRadius: 5,
                        padding: "7px 9px",
                        zIndex: 10,
                        transition: "opacity 0.12s",
                        borderLeft: `2px solid ${s.dot}`,
                      }}
                    >
                      <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: s.text, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {ev.title}
                      </p>
                      {height >= 42 && (
                        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.5625rem", color: s.text, opacity: 0.6, marginTop: 3, letterSpacing: "0.03em" }}>
                          {fmtHour(ev.startHour!)} – {fmtHour(ev.endHour!)}
                        </p>
                      )}
                    </div>
                  );
                });
              })}
            </div>

          </div>
        </div>

      </div>
    );
  }

  // ── Day view ────────────────────────────────────────────────────────────
  function DayView() {
    const dayEvents = getEventsForDay(focusDate);
    return (
      <div className="flex-1 border border-[#E8E4DA] overflow-auto" style={{ borderRadius: 8 }}>
        <div className="border-b border-[#E8E4DA] px-8 py-6 flex items-end justify-between">
          <div>
            <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#AAA", marginBottom: 6 }}>
              {DAY_NAMES[focusDate.getDay()]}
            </p>
            <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "3rem", fontWeight: 300, color: "#1A1814", lineHeight: 1 }}>
              {focusDate.getDate()}
            </p>
          </div>
          <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#AAA", marginBottom: 4 }}>
            {MONTHS[focusDate.getMonth()]} {focusDate.getFullYear()}
          </p>
        </div>
        <div className="px-8 py-6">
          {dayEvents.length === 0 ? (
            <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.875rem", color: "#CCC" }}>No events scheduled.</p>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((ev, i) => {
                const s = EVENT_STYLES[ev.type];
                const nights = Math.round((toDate(ev.end).getTime() - toDate(ev.start).getTime()) / 86400000);
                return (
                  <motion.div key={ev.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-5 px-6 py-5 rounded-lg" style={{ background: s.bg }}>
                    <div className="flex-1">
                      <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.9375rem", color: s.text }}>{ev.title}</p>
                      <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: s.text, opacity: 0.6, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</p>
                    </div>
                    <div className="text-right">
                      {ev.startHour !== undefined ? (
                        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: s.text, opacity: 0.55 }}>
                          {fmtHour(ev.startHour)} – {fmtHour(ev.endHour!)}
                        </p>
                      ) : (
                        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: s.text, opacity: 0.55 }}>
                          {ev.start === ev.end ? "Single day" : `${nights} night${nights !== 1 ? "s" : ""}`}
                        </p>
                      )}
                      {ev.detail && <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: s.text, opacity: 0.4, marginTop: 2 }}>{ev.detail}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F2F0EB] transition-colors text-[#999]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <AnimatePresence mode="wait">
              <motion.span key={title}
                initial={{ opacity: 0, y: dir * 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: dir * -5 }}
                transition={{ duration: 0.18 }}
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.25rem", fontWeight: 300, color: "#1A1814", letterSpacing: "-0.01em", display: "block", minWidth: 220 }}>
                {title}
              </motion.span>
            </AnimatePresence>
            <button onClick={() => navigate(1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F2F0EB] transition-colors text-[#999]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={goToday} className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
            style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", letterSpacing: "0.02em", borderRadius: 3 }}>
            Today
          </button>
        </div>

        {/* View toggle */}
        <div className="flex border border-[#E0DBD0] overflow-hidden" style={{ borderRadius: 4 }}>
          {(["month", "week", "day"] as View[]).map((v, i) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 transition-colors ${i < 2 ? "border-r border-[#E0DBD0]" : ""}`}
              style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", letterSpacing: "0.02em", background: view === v ? "#1B3A2D" : "transparent", color: view === v ? "#fff" : "#777", textTransform: "capitalize" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* View */}
      <AnimatePresence mode="wait">
        <motion.div key={view}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col flex-1" style={{ minHeight: 0 }}>
          {view === "month" && MonthView()}
          {view === "week"  && WeekView()}
          {view === "day"   && DayView()}
        </motion.div>
      </AnimatePresence>

      {/* Tooltip */}
      {tooltip && <EventTooltip tooltip={tooltip} />}
    </div>
  );
}
