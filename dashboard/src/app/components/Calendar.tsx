import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import rosewoodFacilities from "../../../../rosewood_facilities.json";
import { useLiveBookings } from "@/app/lib/bookings";

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

const ROSEWOOD_NAME =
  (rosewoodFacilities as any)?.hotel_name || "Rosewood Sand Hill";

const FACILITIES = (rosewoodFacilities as any)?.facilities || {};
const MADERA = FACILITIES?.dining_and_culinary?.find((f: any) => f?.name === "Madera");
const MADERA_BAR = FACILITIES?.dining_and_culinary?.find((f: any) => f?.name === "Madera Bar");
const BICI = FACILITIES?.dining_and_culinary?.find((f: any) => f?.name === "Bici Coffee");
const POOL_DINING = FACILITIES?.dining_and_culinary?.find((f: any) => (f?.name || "").includes("Pool Bar"));
const ASAYA = FACILITIES?.wellness_spa_and_beauty?.find((f: any) => (f?.name || "").includes("Asaya"));
const FITNESS = FACILITIES?.wellness_spa_and_beauty?.find((f: any) => (f?.name || "").includes("Fitness Center"));
const POOL = FACILITIES?.pools_and_outdoor_relaxation?.find((f: any) => (f?.name || "").includes("Outdoor Heated Pool"));
const EVENTS_AND_GARDENS = FACILITIES?.event_venues_and_gardens?.find((f: any) => (f?.name || "").includes("Vista Lawn"));
const TRANSPORT = FACILITIES?.personalized_programs_and_guest_amenities?.find((f: any) => (f?.name || "").includes("Mercedes-Benz"));

function mkId(prefix: string, i: number) {
  return `${prefix}${i}`;
}

// All events: those with startHour are timed; those without are all-day/multi-day
// Rosewood-specific programming + stays around May 2026.
const EVENTS: CalEvent[] = [
  // Stays / VIPs
  {
    id: "stay-1",
    title: "Tanaka — Anniversary Weekend",
    start: "2026-05-16",
    end: "2026-05-18",
    type: "vip",
    detail: `${ROSEWOOD_NAME} · Corner Suite · Anniversary weekend`,
  },
  {
    id: "stay-2",
    title: "Harrington — Board Retreat",
    start: "2026-05-07",
    end: "2026-05-10",
    type: "vip",
    detail: `${ROSEWOOD_NAME} · Executive hosts · Quiet work blocks reserved`,
  },
  {
    id: "stay-3",
    title: "Williams Family Stay",
    start: "2026-05-14",
    end: "2026-05-17",
    type: "stay",
    detail: `${ROSEWOOD_NAME} · Family amenities · Rose Buds program requested`,
  },
  {
    id: "stay-4",
    title: "Park — First Visit",
    start: "2026-05-22",
    end: "2026-05-25",
    type: "stay",
    detail: `${ROSEWOOD_NAME} · Garden Suite · Welcome amenity + local itinerary`,
  },

  // Key arrivals / check-in touchpoints
  {
    id: "vip-arr-1",
    title: "Tanaka Arrival",
    start: "2026-05-16",
    end: "2026-05-16",
    type: "vip",
    detail: "Town car standby · VIP welcome · Luggage to suite",
    startHour: 17,
    endHour: 18,
  },
  {
    id: "vip-arr-2",
    title: "Harrington Check-in",
    start: "2026-05-07",
    end: "2026-05-07",
    type: "vip",
    detail: "Pre-keyed suite · Meeting room tech check",
    startHour: 15,
    endHour: 16,
  },
  {
    id: "stay-arr-1",
    title: "Park Check-in",
    start: "2026-05-22",
    end: "2026-05-22",
    type: "stay",
    detail: "Welcome tour · E-bike availability check",
    startHour: 15,
    endHour: 16,
  },

  // Dining (Rosewood facilities)
  {
    id: "din-1",
    title: `${MADERA?.name || "Madera"} Dinner`,
    start: "2026-05-16",
    end: "2026-05-16",
    type: "dining",
    detail: "Outdoor terrace preference · Wine service note · Fireside seating if cool",
    startHour: 19,
    endHour: 21,
  },
  {
    id: "din-2",
    title: `${BICI?.name || "Bici Coffee"} — Morning Pickup`,
    start: "2026-05-17",
    end: "2026-05-17",
    type: "dining",
    detail: "House pastries · Espresso drinks · Early start option",
    startHour: 8,
    endHour: 8.5,
  } as any,
  {
    id: "din-3",
    title: "Afternoon Tea (Pool Bar & Grill)",
    start: "2026-05-17",
    end: "2026-05-17",
    type: "dining",
    detail:
      POOL_DINING?.afternoon_tea ||
      "Reimagined tea service · Premium loose-leaf · Chocolate-infused pastries",
    startHour: 15,
    endHour: 16.5,
  } as any,
  // Friday nights at the bar (weekly programming)
  ...[
    "2026-05-08",
    "2026-05-15",
    "2026-05-22",
    "2026-05-29",
  ].map((d, i) => ({
    id: mkId("bar-", i + 1),
    title: `${MADERA_BAR?.name || "Madera Bar"} — Friday Night`,
    start: d,
    end: d,
    type: "dining" as const,
    detail:
      MADERA_BAR?.entertainment ||
      "Live jazz or DJ vinyl set · Terrace fireside seating",
    startHour: 20,
    endHour: 22,
  })),

  // Wellness (Asaya, Fitness/Motion)
  {
    id: "spa-1",
    title: `${ASAYA?.name || "Asaya Spa"} — Couples Reset`,
    start: "2026-05-17",
    end: "2026-05-17",
    type: "spa",
    detail:
      ASAYA?.amenities ||
      "Steam/sauna + outdoor whirlpool · Pre-treatment arrival 20 min",
    startHour: 10,
    endHour: 12,
  },
  {
    id: "spa-2",
    title: `${ASAYA?.name || "Asaya Spa"} — Skin Solutions`,
    start: "2026-05-19",
    end: "2026-05-19",
    type: "spa",
    detail: ASAYA?.services || "Advanced skin solutions · Restorative body therapy",
    startHour: 9,
    endHour: 10.5,
  } as any,
  ...[
    "2026-05-16",
    "2026-05-23",
    "2026-05-30",
  ].map((d, i) => ({
    id: mkId("yoga-", i + 1),
    title: "Lawn Yoga (Motion Studio)",
    start: d,
    end: d,
    type: "spa" as const,
    detail: FITNESS?.classes || "Saturday lawn yoga · Pilates · Sound bath sessions",
    startHour: 9,
    endHour: 10,
  })),

  // Outdoor leisure (pool / cabanas)
  {
    id: "pool-1",
    title: "Poolside Cabana Hold",
    start: "2026-05-16",
    end: "2026-05-16",
    type: "stay",
    detail: `${POOL?.hours || "Daily 8:00 AM – 10:00 PM"} · Butler service · Pool Bar delivery`,
    startHour: 12,
    endHour: 15,
  },

  // Events (Vista Lawn + ballrooms)
  {
    id: "evt-1",
    title: "Vista Lawn — Tech Runthrough",
    start: "2026-05-08",
    end: "2026-05-08",
    type: "vip",
    detail: EVENTS_AND_GARDENS?.description || "Indoor/outdoor event spaces · Presentation technology",
    startHour: 14,
    endHour: 15,
  },
  {
    id: "evt-2",
    title: "Ballrooms A & B — Evening Reception",
    start: "2026-05-09",
    end: "2026-05-09",
    type: "vip",
    detail: "16-foot vaulted ceilings · AV/lighting cues · Welcome beverage service",
    startHour: 18,
    endHour: 21,
  },

  // Transport / concierge privileges
  {
    id: "tx-1",
    title: "Mercedes-Benz Driving Experience",
    start: "2026-05-18",
    end: "2026-05-18",
    type: "vip",
    detail:
      TRANSPORT?.test_drives ||
      "Reserve a Mercedes-Benz for a scenic coastal drive · Front office coordination",
    startHour: 11,
    endHour: 13,
  },
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
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  const hh = (hours + Math.floor(minutes / 60)) % 24;
  const mm = minutes % 60;
  const isPM = hh >= 12;
  const displayH = hh % 12 === 0 ? 12 : hh % 12;
  const displayM = mm === 0 ? "" : `:${String(mm).padStart(2, "0")}`;
  return `${displayH}${displayM} ${isPM ? "PM" : "AM"}`;
}

const TODAY_KEY = dateKey(new Date());

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
  const [sheetOpen, setSheetOpen] = useState(false);

  // Live bookings produced by the conversation pipeline. Calendar treats them
  // identically to the hardcoded EVENTS — they get folded into the same lists
  // for month/week/day rendering and the day-sheet export.
  const { bookings: liveBookings } = useLiveBookings();
  const liveEvents = useMemo<CalEvent[]>(
    () =>
      liveBookings.map((b) => ({
        id: b.id,
        title: b.title,
        start: b.date,
        end: b.date,
        type: b.category,
        detail: b.detail,
        startHour: b.startHour,
        endHour: b.endHour,
      })),
    [liveBookings],
  );
  const allEvents = useMemo(() => [...EVENTS, ...liveEvents], [liveEvents]);
  const allDayEvents = useMemo(
    () => allEvents.filter((ev) => ev.startHour === undefined),
    [allEvents],
  );
  const timedEvents = useMemo(
    () => allEvents.filter((ev) => ev.startHour !== undefined),
    [allEvents],
  );

  function getEventsForDayLive(date: Date): CalEvent[] {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return allEvents.filter((ev) => d >= toDate(ev.start) && d <= toDate(ev.end));
  }

  const handleHover = useCallback((ev: CalEvent, x: number, y: number) => {
    setTooltip({ event: ev, x, y });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  function formatSheetDate(date: Date) {
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function getDaySheetData(date: Date) {
    const dayEvents = getEventsForDayLive(date).slice().sort((a, b) => {
      const ah = a.startHour ?? -1;
      const bh = b.startHour ?? -1;
      if (ah !== bh) return ah - bh;
      return a.title.localeCompare(b.title);
    });

    const sections: Array<{ title: string; items: CalEvent[] }> = [
      { title: "Arrivals / Stays", items: dayEvents.filter((e) => e.type === "vip" || e.type === "stay") },
      { title: "Dining", items: dayEvents.filter((e) => e.type === "dining") },
      { title: "Spa & Wellness", items: dayEvents.filter((e) => e.type === "spa") },
    ];

    if (sections.every((s) => s.items.length === 0)) {
      sections.push({ title: "Schedule", items: dayEvents });
    }

    return { dayEvents, sections };
  }

  function buildSheetText(date: Date) {
    const { sections } = getDaySheetData(date);
    const lines: string[] = [];
    lines.push(`${ROSEWOOD_NAME} — Day Sheet`);
    lines.push(formatSheetDate(date));
    lines.push("");
    for (const s of sections) {
      if (s.items.length === 0) continue;
      lines.push(s.title);
      for (const ev of s.items) {
        const time = ev.startHour !== undefined ? `${fmtHour(ev.startHour)}–${fmtHour(ev.endHour!)}` : "all day";
        lines.push(`- ${time} · ${ev.title}${ev.detail ? ` — ${ev.detail}` : ""}`);
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  function buildSheetHtml(date: Date) {
    const { sections } = getDaySheetData(date);
    const header = `${escapeHtml(ROSEWOOD_NAME)} — Day Sheet`;
    const sub = escapeHtml(formatSheetDate(date));

    const blocks = sections
      .filter((s) => s.items.length > 0)
      .map((s) => {
        const items = s.items
          .map((ev) => {
            const time = ev.startHour !== undefined ? `${fmtHour(ev.startHour)} – ${fmtHour(ev.endHour!)}` : "All day";
            return `
              <div class="item">
                <div class="time">${escapeHtml(time)}</div>
                <div class="main">
                  <div class="title">${escapeHtml(ev.title)}</div>
                  ${ev.detail ? `<div class="detail">${escapeHtml(ev.detail)}</div>` : ""}
                </div>
              </div>
            `;
          })
          .join("");
        return `
          <section class="section">
            <h2>${escapeHtml(s.title)}</h2>
            ${items}
          </section>
        `;
      })
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${header}</title>
          <style>
            :root { --fg:#111; --muted:#666; --border:#e6e6e6; --green:#0a3622; --cream:#faf8f3; }
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; }
            body {
              margin: 0;
              background: var(--cream);
              color: var(--fg);
              font-family: "Austin", "Austin Text", "Austin Roman", "Austin Display", "Ivar Text", "Canela", "Cormorant Garamond", Georgia, serif;
              font-weight: 300;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page { padding: 44px 52px; }
            .card {
              background: #fff;
              border: 1px solid var(--border);
              border-radius: 16px;
              padding: 28px 28px 24px;
              box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
              width: 100%;
              max-width: 920px;
              margin: 0 auto;
            }
            .brand { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
            .brand h1 { margin:0; font-size: 20px; letter-spacing: 0.01em; font-weight: 300; }
            .brand .sub { margin-top: 8px; color: var(--muted); font-size: 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
            .badge { background: var(--green); color:#fff; padding: 7px 12px; border-radius: 999px; font-size: 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
            .section { margin-top: 22px; }
            .section h2 {
              margin: 0 0 10px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.14em;
              color: var(--muted);
              font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
            }
            .item { display:flex; gap: 14px; padding: 10px 0; border-top: 1px solid #f2f2f2; }
            .item:first-of-type { border-top: 1px solid var(--border); }
            .time { width: 120px; color: var(--muted); font-size: 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
            .title { font-size: 15px; line-height: 1.25; }
            .detail { margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.4; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
            @media print {
              @page { margin: 18mm; }
              body { background: #fff; }
              .page { padding: 0; }
              .card {
                border: none;
                border-radius: 0;
                box-shadow: none;
                padding: 0;
                max-width: none;
                margin: 0;
              }
              .badge { background: var(--green) !important; color: #fff !important; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="card">
              <div class="brand">
                <div>
                  <h1>${header}</h1>
                  <div class="sub">${sub}</div>
                </div>
                <div class="badge">Rosewood</div>
              </div>
              ${blocks}
            </div>
          </div>
        </body>
      </html>
    `.trim();
  }

  async function sendItinerary() {
    const text = buildSheetText(focusDate);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
    setSheetOpen(true);
  }

  function printDaySheet() {
    const html = buildSheetHtml(focusDate);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer,width=900,height=800");
    if (!w) return;
    const cleanup = () => {
      try { URL.revokeObjectURL(url); } catch {}
    };
    const t = setInterval(() => {
      try {
        if (w.document?.readyState === "complete") {
          clearInterval(t);
          w.focus();
          // allow layout before printing
          setTimeout(() => {
            try { w.print(); } finally { cleanup(); }
          }, 250);
        }
      } catch {
        // cross-origin during initial navigation; ignore until ready
      }
    }, 150);
  }

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
    // For month view show all events (timed ones appear as single-day bars).
    // Includes live bookings produced during the active call.
    const allForMonth = allEvents;
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

    // All-day spanning bars (static EVENTS only — live bookings always carry
    // explicit hours).
    const placed = placeEventsForDays(days, 3, allDayEvents);
    const maxAllDayRow = placed.reduce((m, ev) => Math.max(m, ev.row), -1);
    const allDayRows = Math.max(1, maxAllDayRow + 1);
    const allDayAreaH = allDayRows * ALL_DAY_ROW_H + 16;

    // Timed events this week — combined hardcoded + live.
    const timedInWeek = timedEvents.filter(ev => weekKeys.has(ev.start));

    // Auto hour range — expand/contract based on what's booked
    let firstHour = 8, lastHour = 18;
    if (timedInWeek.length > 0) {
      firstHour = Math.max(6, Math.floor(Math.min(...timedInWeek.map(ev => ev.startHour!))) - 1);
      lastHour  = Math.min(24, Math.ceil(Math.max(...timedInWeek.map(ev => ev.endHour!))) + 1);
    }
    const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);

    // Group timed events per day
    const timedByDay: Record<string, CalEvent[]> = {};
    timedInWeek.forEach(ev => {
      if (!timedByDay[ev.start]) timedByDay[ev.start] = [];
      timedByDay[ev.start].push(ev);
    });

    // Assign non-overlapping lanes per day so events don't all get squeezed.
    function computeLanes(dayEvents: CalEvent[]) {
      const sorted = [...dayEvents].sort((a, b) => (a.startHour! - b.startHour!) || (a.endHour! - b.endHour!));
      const lanes: CalEvent[][] = [];
      const laneForId = new Map<string, number>();

      for (const ev of sorted) {
        let laneIdx = lanes.findIndex((lane) => (lane[lane.length - 1]?.endHour ?? -Infinity) <= ev.startHour!);
        if (laneIdx === -1) {
          laneIdx = lanes.length;
          lanes.push([]);
        }
        lanes[laneIdx].push(ev);
        laneForId.set(ev.id, laneIdx);
      }

      return { lanesCount: lanes.length || 1, laneForId };
    }

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
                const { lanesCount, laneForId } = computeLanes(dayEvents);
                const colW = 100 / 7;

                return dayEvents.map((ev, evIdx) => {
                  const totalInCol = lanesCount;
                  const laneIdx = laneForId.get(ev.id) ?? 0;
                  const evW = (colW / totalInCol);
                  const left = colW * colIdx + evW * laneIdx;
                  const top = (ev.startHour! - firstHour) * HOUR_H;
                  const height = (ev.endHour! - ev.startHour!) * HOUR_H;
                  const s = EVENT_STYLES[ev.type];
                  const isNarrow = evW < 7.5;

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
                      {isNarrow ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full" style={{ background: s.text, opacity: 0.9 }} />
                        </div>
                      ) : (
                        <>
                          <p
                            className="truncate"
                            style={{
                              fontFamily: "General Sans, sans-serif",
                              fontSize: "0.6875rem",
                              color: s.text,
                              lineHeight: 1.25,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ev.title}
                          </p>
                          {height >= 38 && (
                            <p
                              className="truncate"
                              style={{
                                fontFamily: "General Sans, sans-serif",
                                fontSize: "0.5625rem",
                                color: s.text,
                                opacity: 0.65,
                                marginTop: 3,
                                letterSpacing: "0.03em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmtHour(ev.startHour!)} – {fmtHour(ev.endHour!)}
                            </p>
                          )}
                        </>
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
    const dayEvents = getEventsForDayLive(focusDate);
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
          <div className="flex items-end gap-4">
            <div className="flex gap-2">
              <button
                onClick={sendItinerary}
                className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
                style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", letterSpacing: "0.02em", borderRadius: 3 }}
              >
                Send itinerary
              </button>
              <button
                onClick={printDaySheet}
                className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
                style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", letterSpacing: "0.02em", borderRadius: 3 }}
              >
                Print day sheet
              </button>
            </div>
            <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#AAA", marginBottom: 4 }}>
              {MONTHS[focusDate.getMonth()]} {focusDate.getFullYear()}
            </p>
          </div>
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

      {/* Day sheet modal (copy/share preview) */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={() => setSheetOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-[#E8E4DA] shadow-xl rounded-lg"
              style={{ width: 720, maxWidth: "calc(100vw - 48px)", margin: "8vh auto", padding: 20 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.5rem", fontWeight: 300, color: "#1A1814", lineHeight: 1.1 }}>
                    {ROSEWOOD_NAME}
                  </p>
                  <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#888", marginTop: 6 }}>
                    {formatSheetDate(focusDate)}
                  </p>
                </div>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
                  style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", letterSpacing: "0.02em", borderRadius: 3 }}
                >
                  Close
                </button>
              </div>

              <div className="mt-4">
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#AAA", marginBottom: 8 }}>
                  Copy / Share
                </p>
                <textarea
                  readOnly
                  value={buildSheetText(focusDate)}
                  className="w-full border border-[#E8E4DA] rounded-md px-3 py-2"
                  style={{ minHeight: 220, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: "0.8125rem", color: "#1A1814" }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(buildSheetText(focusDate)); } catch {}
                    }}
                    className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
                    style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", letterSpacing: "0.02em", borderRadius: 3 }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={printDaySheet}
                    className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
                    style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", letterSpacing: "0.02em", borderRadius: 3 }}
                  >
                    Print
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
