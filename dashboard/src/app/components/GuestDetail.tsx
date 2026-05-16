import { motion } from "motion/react";
import { ArrowLeft, Plane, Clock, Utensils, BedDouble, MapPin } from "lucide-react";

export interface GuestProfile {
  id: string;
  name: string;
  room: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  type: "vip" | "stay" | "dining" | "spa";
  status: "in-house" | "arriving" | "departing";
  note?: string;
  flight?: { number: string; from: string; eta: string };
  pastStays: { date: string; context: string; room: string }[];
  preferences: { dining: string; room: string; schedule?: string };
  notable?: string;
  background?: { interests?: string; city?: string; occasion?: string };
}

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

function Divider() {
  return <div className="h-px bg-[#F0EDE8]" />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded" style={{ background: "#F4F2ED", fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#555" }}>
      {children}
    </span>
  );
}

export function GuestDetail({ guest, onBack }: { guest: GuestProfile; onBack: () => void }) {
  const ss = STATUS_STYLE[guest.status];

  return (
    <motion.div
      className="h-full overflow-y-auto bg-white"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="max-w-2xl mx-auto px-12 py-10">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-10 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" style={{ color: "#AAA", strokeWidth: 1.5 }} />
          <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#AAA" }}>
            Guests
          </span>
        </button>

        {/* Hero */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: TYPE_COLOR[guest.type] }}>
            <span style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.75rem", color: "#fff", fontWeight: 300 }}>
              {guest.name.trim()[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "2rem", fontWeight: 300, color: "#1A1814", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {guest.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#999" }}>
                {guest.room}
              </span>
              <span style={{ color: "#DDD" }}>·</span>
              <span className="px-2.5 py-1 rounded" style={{ background: ss.bg, fontFamily: "General Sans, sans-serif", fontSize: "0.625rem", color: ss.color, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {ss.label}
              </span>
              {guest.notable && (
                <>
                  <span style={{ color: "#DDD" }}>·</span>
                  <span style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#999" }}>
                    {guest.notable}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <Divider />

        {/* Stay details */}
        <div className="py-8">
          <Label>Stay</Label>
          <div className="flex gap-12">
            {[
              { label: "Check-in",  value: guest.checkIn  },
              { label: "Check-out", value: guest.checkOut },
              { label: "Nights",    value: String(guest.nights) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#AAA", marginBottom: 4 }}>{label}</p>
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "1rem", color: "#1A1814" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Flight */}
        {guest.flight && (
          <>
            <Divider />
            <div className="py-8">
              <Label>Arrival Flight</Label>
              <div className="flex items-center gap-4 px-5 py-4 rounded" style={{ background: "#F7F5F0" }}>
                <Plane className="w-4 h-4 flex-shrink-0" style={{ color: "#999", strokeWidth: 1.5 }} />
                <div>
                  <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.9375rem", color: "#1A1814" }}>
                    {guest.flight.number} · {guest.flight.from}
                  </p>
                  <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.75rem", color: "#AAA", marginTop: 2 }}>
                    ETA {guest.flight.eta}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Past stays */}
        {guest.pastStays.length > 0 && (
          <>
            <Divider />
            <div className="py-8">
              <Label>Past Stays · {guest.pastStays.length}</Label>
              <div className="space-y-5">
                {guest.pastStays.map((stay, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#D5D1C8" }} />
                      {i < guest.pastStays.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "#EBEBEB" }} />}
                    </div>
                    <div className="pb-2">
                      <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#AAA", marginBottom: 3 }}>{stay.date}</p>
                      <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.9375rem", color: "#1A1814" }}>{stay.context}</p>
                      <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: "#999", marginTop: 2 }}>{stay.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Preferences */}
        <Divider />
        <div className="py-8">
          <Label>Preferences</Label>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Utensils className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#CCC", strokeWidth: 1.5 }} />
              <div>
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#BBB", marginBottom: 3 }}>Dining</p>
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.9rem", color: "#444", lineHeight: 1.6 }}>{guest.preferences.dining}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <BedDouble className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#CCC", strokeWidth: 1.5 }} />
              <div>
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#BBB", marginBottom: 3 }}>Room</p>
                <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.9rem", color: "#444", lineHeight: 1.6 }}>{guest.preferences.room}</p>
              </div>
            </div>
            {guest.preferences.schedule && (
              <div className="flex gap-4">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#CCC", strokeWidth: 1.5 }} />
                <div>
                  <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.6875rem", color: "#BBB", marginBottom: 3 }}>Schedule</p>
                  <p style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.9rem", color: "#444", lineHeight: 1.6 }}>{guest.preferences.schedule}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Background */}
        {guest.background && (
          <>
            <Divider />
            <div className="py-8">
              <Label>Background</Label>
              <div className="flex flex-wrap gap-2">
                {guest.background.city && (
                  <Tag><MapPin className="w-3 h-3" style={{ color: "#AAA" }} />{guest.background.city}</Tag>
                )}
                {guest.background.interests && <Tag>{guest.background.interests}</Tag>}
                {guest.background.occasion && <Tag>{guest.background.occasion}</Tag>}
              </div>
            </div>
          </>
        )}

      </div>
    </motion.div>
  );
}
