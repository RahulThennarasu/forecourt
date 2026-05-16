import { motion } from "motion/react";
import { GlassPanel } from "./GlassPanel";
import { Calendar, Wine, Sparkles, Waves, Home, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface TimelineEvent {
  time: string;
  title: string;
  icon: any;
  status: "confirmed" | "suggested" | "vip";
  coordination?: string[];
  id: number;
}

const events: TimelineEvent[] = [
  {
    time: "5:00 PM",
    title: "Arrival Expected",
    icon: Home,
    status: "confirmed",
    coordination: ["Housekeeping notified", "Welcome amenity prepared"],
    id: 1
  },
  {
    time: "5:30 PM",
    title: "Corner Suite Requested",
    icon: Sparkles,
    status: "confirmed",
    coordination: ["Front desk confirmed"],
    id: 2
  },
  {
    time: "7:00 PM",
    title: "Quiet Table Prepared at Madera",
    icon: Calendar,
    status: "confirmed",
    coordination: ["Madera notified", "Patio corner table reserved"],
    id: 3
  },
  {
    time: "7:15 PM",
    title: "Anniversary Surprise Coordinated",
    icon: Sparkles,
    status: "vip",
    coordination: ["Sommelier notified", "Champagne service arranged"],
    id: 4
  },
  {
    time: "7:30 PM",
    title: "Sommelier Pairing Prepared",
    icon: Wine,
    status: "confirmed",
    coordination: ["Sancerre preference noted"],
    id: 5
  },
  {
    time: "9:00 AM Tomorrow",
    title: "Sense Spa Hold Requested",
    icon: Waves,
    status: "suggested",
    id: 6
  }
];

export function GuestTimeline() {
  const [visibleEvents, setVisibleEvents] = useState<number[]>([]);

  useEffect(() => {
    events.forEach((event, index) => {
      setTimeout(() => {
        setVisibleEvents(prev => [...prev, event.id]);
      }, index * 800);
    });
  }, []);

  return (
    <GlassPanel className="h-full flex flex-col p-8">
      <h2 className="text-[#F5F1E8] mb-8 tracking-tight" style={{ fontFamily: 'Austin, serif', fontSize: '2rem', fontWeight: 300 }}>
        Guest Journey Timeline
      </h2>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="relative">
          <div className="absolute left-[1.875rem] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#C8A96B]/50 via-[#C8A96B]/30 to-transparent" />

          <div className="space-y-6">
            {events.map((event, index) => (
              visibleEvents.includes(event.id) && (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex gap-4"
                >
                  <div className="relative flex-shrink-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className={`w-15 h-15 rounded-full flex items-center justify-center border-2 ${
                        event.status === 'vip'
                          ? 'bg-[#C8A96B]/30 border-[#C8A96B]'
                          : event.status === 'confirmed'
                          ? 'bg-[#C8A96B]/20 border-[#C8A96B]/50'
                          : 'bg-white/[0.05] border-white/20'
                      }`}
                      style={event.status === 'vip' ? { boxShadow: '0 0 20px rgba(200, 169, 107, 0.4)' } : {}}
                    >
                      <event.icon className={`w-5 h-5 ${
                        event.status === 'vip' ? 'text-[#C8A96B]' : 'text-[#F5F1E8]/70'
                      }`} />
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className={`flex-1 p-5 rounded-xl border ${
                      event.status === 'vip'
                        ? 'bg-[#C8A96B]/10 border-[#C8A96B]/30'
                        : event.status === 'confirmed'
                        ? 'bg-white/[0.04] border-white/[0.08]'
                        : 'bg-white/[0.02] border-white/[0.05]'
                    }`}
                    style={event.status === 'vip' ? { boxShadow: '0 4px 20px rgba(200, 169, 107, 0.15)' } : {}}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#C8A96B]" style={{ fontFamily: 'PP Neue Montreal, sans-serif', letterSpacing: '0.05em' }}>
                        {event.time}
                      </span>
                      {event.status === 'vip' && (
                        <div className="px-2.5 py-1 bg-[#C8A96B]/20 rounded-full border border-[#C8A96B]/30">
                          <span className="text-[10px] text-[#C8A96B]" style={{ fontFamily: 'PP Neue Montreal, sans-serif', letterSpacing: '0.08em' }}>
                            VIP MOMENT
                          </span>
                        </div>
                      )}
                      {event.status === 'suggested' && (
                        <div className="px-2.5 py-1 bg-white/[0.05] rounded-full border border-white/10">
                          <span className="text-[10px] text-[#F5F1E8]/60" style={{ fontFamily: 'PP Neue Montreal, sans-serif', letterSpacing: '0.08em' }}>
                            SUGGESTED
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-[#F5F1E8] mb-3" style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '1rem', lineHeight: '1.4' }}>
                      {event.title}
                    </h3>

                    {event.coordination && (
                      <div className="space-y-1.5">
                        {event.coordination.map((coord, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-1 h-1 rounded-full bg-[#C8A96B]/60" />
                            <span className="text-xs text-[#F5F1E8]/50" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                              {coord}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
