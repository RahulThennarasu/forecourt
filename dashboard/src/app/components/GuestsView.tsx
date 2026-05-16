import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { GuestDetail, GuestProfile } from "./GuestDetail";
import { LiveGuest, useLiveBookings } from "@/app/lib/bookings";

const GUESTS: GuestProfile[] = [
  {
    id: "g1",
    name: "Mr. & Mrs. Tanaka",
    room: "Corner Suite",
    checkIn: "May 16", checkOut: "May 18", nights: 2,
    type: "vip", status: "in-house",
    note: "Anniversary weekend",
    flight: { number: "UA241", from: "HND → SFO", eta: "4:32 PM PT" },
    pastStays: [
      { date: "Sept 2023", context: "Engagement weekend", room: "Corner suite, oak tree view" },
      { date: "Mar 2024",  context: "Business trip",     room: "Standard king" },
    ],
    preferences: {
      dining:   "Vegetarian (wife), prefers Sancerre, quiet seating",
      room:     "Cool temperature (~68°F), extra duvet",
      schedule: "Early breakfast on business trips",
    },
    notable: "Anniversary this weekend",
    background: { city: "Tokyo", interests: "Wine, tennis", occasion: "2nd anniversary" },
  },
  {
    id: "g2",
    name: "Williams Family",
    room: "Garden Villa",
    checkIn: "May 14", checkOut: "May 17", nights: 3,
    type: "stay", status: "departing",
    pastStays: [
      { date: "Aug 2025", context: "Summer family trip", room: "Garden villa" },
    ],
    preferences: {
      dining:   "Two children — allergy to tree nuts, juice at breakfast",
      room:     "Extra rollaway, ground floor access",
      schedule: "Late checkout preferred",
    },
    background: { city: "Los Angeles", interests: "Pool, kids programme", occasion: "Annual family stay" },
  },
  {
    id: "g3",
    name: "Park",
    room: "Garden Suite",
    checkIn: "May 22", checkOut: "May 25", nights: 3,
    type: "stay", status: "arriving",
    pastStays: [],
    preferences: {
      dining:   "No shellfish, prefers lighter fare",
      room:     "High floor if possible, quiet side of property",
    },
    background: { city: "Seoul", interests: "Hiking, wellness" },
  },
  {
    id: "g4",
    name: "Hendricks",
    room: "Deluxe Room",
    checkIn: "May 30", checkOut: "Jun 1", nights: 2,
    type: "stay", status: "arriving",
    note: "Late arrival",
    pastStays: [
      { date: "Nov 2024", context: "Business conference", room: "Standard king" },
    ],
    preferences: {
      dining:   "Steak, whisky — usually dines at the bar",
      room:     "Warm temperature, firm mattress",
      schedule: "Late riser, no early calls",
    },
    background: { city: "New York", interests: "Golf, finance events" },
  },
  {
    id: "g5",
    name: "Harrington",
    room: "VIP Suite",
    checkIn: "May 7", checkOut: "May 10", nights: 3,
    type: "vip", status: "arriving",
    pastStays: [
      { date: "Jan 2024",  context: "Board retreat",      room: "VIP suite" },
      { date: "June 2023", context: "Private dinner",     room: "Private dining, Madera" },
    ],
    preferences: {
      dining:   "Formal dining, prefers window table at Madera, dry martini on arrival",
      room:     "Newspapers printed, blackout curtains, no fragrance in amenities",
    },
    notable: "Board member — discretion essential",
    background: { city: "San Francisco", interests: "Art, polo", occasion: "Board retreat" },
  },
  {
    id: "g6",
    name: "Chen",
    room: "Spa Suite",
    checkIn: "May 12", checkOut: "May 14", nights: 2,
    type: "spa", status: "arriving",
    note: "Spa retreat",
    pastStays: [],
    preferences: {
      dining:   "Plant-based only, herbal teas, no caffeine",
      room:     "Minimal scent, dim lighting on arrival, sound machine",
      schedule: "Early morning treatments preferred",
    },
    background: { city: "Seattle", interests: "Meditation, yoga", occasion: "Wellness retreat" },
  },
];

const TYPE_COLOR: Record<GuestProfile["type"], string> = {
  vip:    "#1B3A2D",
  stay:   "#4A8C5C",
  dining: "#A07850",
  spa:    "#5A5EA0",
};

const STATUS_STYLE: Record<GuestProfile["status"], { color: string; bg: string; label: string }> = {
  "in-house":  { color: "#1B3A2D", bg: "#DCE8DE", label: "In House"  },
  "arriving":  { color: "#6B4F35", bg: "#F2ECE3", label: "Arriving"  },
  "departing": { color: "#3A3D6B", bg: "#E8E9F2", label: "Departing" },
};

function GuestRow({ guest, index, onClick }: { guest: GuestProfile; index: number; onClick: () => void }) {
  const ss = STATUS_STYLE[guest.status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onClick}
      className="flex items-center gap-4 py-4 border-b border-[#F2F0EC] hover:bg-[#FAFAF8] transition-colors cursor-pointer px-2 -mx-2 rounded"
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: TYPE_COLOR[guest.type] }}>
        <span style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1rem", color: "#fff", fontWeight: 300 }}>
          {guest.name.trim()[0].toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.875rem", color: "#1A1814", letterSpacing: "0.01em" }}>
          {guest.name}
        </p>
        {guest.note && (
          <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#AAA", marginTop: 1 }}>
            {guest.note}
          </p>
        )}
      </div>

      <div className="text-right hidden sm:block" style={{ minWidth: 110 }}>
        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#555" }}>{guest.room}</p>
      </div>

      <div className="text-right" style={{ minWidth: 130 }}>
        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#555" }}>
          {guest.checkIn} – {guest.checkOut}
        </p>
        <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#AAA", marginTop: 1 }}>
          {guest.nights} night{guest.nights !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-shrink-0 px-2.5 py-1 rounded" style={{ background: ss.bg }}>
        <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: ss.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {ss.label}
        </span>
      </div>
    </motion.div>
  );
}

// Convert a guest captured live via the call WebSocket into the same
// GuestProfile shape the rest of GuestsView already renders. Most fields are
// intentionally sparse — we only know the name and the last four digits of
// their number. For the hand-built Mr. Meyer demo profile we hydrate a richer
// view since CLAUDE.md keeps that persona's details server-side; on the
// frontend we mirror the bits the user cares about (suite, status).
function liveGuestToProfile(g: LiveGuest): GuestProfile {
  const isMeyer = /meyer/i.test(g.name);
  return {
    id: `live-${g.callSid}`,
    name: g.name,
    room: isMeyer ? "Mountain-View Suite (Presidents Wing)" : "—",
    checkIn: "Today",
    checkOut: "Today",
    nights: 1,
    type: isMeyer ? "vip" : "stay",
    status: "in-house",
    note: g.phoneSuffix ? `Recent call · •••-${g.phoneSuffix}` : "Recent call",
    preferences: isMeyer
      ? {
          dining: "Low-stimulus dining after board calls · Chef's Counter alcove at Madera",
          room: "Mountain-View Suite · private in-villa check-in",
          schedule: "5:30 AM ride · early starts",
        }
      : {},
    background: isMeyer
      ? {
          interests: "Elite endurance cycling · philanthropy",
          occasion: "Board calls + private donor briefing",
        }
      : {},
  };
}

export function GuestsView() {
  const [selected, setSelected] = useState<GuestProfile | null>(null);
  const { liveGuests } = useLiveBookings();

  const allGuests = useMemo<GuestProfile[]>(() => {
    // Live guests go FIRST in their status group so a fresh call surfaces
    // at the top of "In House".
    const live = liveGuests.map(liveGuestToProfile);
    // Drop any hardcoded entry with the same name so we don't double-list.
    const liveNames = new Set(live.map((g) => g.name.toLowerCase()));
    const filteredStatic = GUESTS.filter((g) => !liveNames.has(g.name.toLowerCase()));
    return [...live, ...filteredStatic];
  }, [liveGuests]);

  const groups: { status: GuestProfile["status"]; label: string }[] = [
    { status: "in-house",  label: "In House"  },
    { status: "departing", label: "Departing" },
    { status: "arriving",  label: "Arriving"  },
  ];

  if (selected) {
    return <GuestDetail guest={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl py-10 px-10">
        <h2 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.75rem", fontWeight: 300, color: "#1A1814", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: 32 }}>
          Guests
        </h2>

        <div className="space-y-10">
          {groups.map(({ status, label }) => {
            const list = allGuests.filter(g => g.status === status);
            if (!list.length) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-3 mb-4">
                  <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB" }}>
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-[#EBEBEB]" />
                  <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: "#CCC" }}>
                    {list.length}
                  </span>
                </div>
                <div className="space-y-px">
                  {list.map((guest, i) => (
                    <GuestRow key={guest.id} guest={guest} index={i} onClick={() => setSelected(guest)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
