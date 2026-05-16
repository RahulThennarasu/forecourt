import { motion } from "motion/react";
import { GlassPanel } from "./GlassPanel";
import { ArrowRight, Users, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";

interface Match {
  interest: string;
  experience: string[];
  icon: any;
  id: number;
}

const matches: Match[] = [
  {
    interest: "Tennis",
    experience: ["Morning court availability", "Private lesson opening"],
    icon: Dumbbell,
    id: 1
  },
  {
    interest: "Family",
    experience: ["Kids pool program", "Weekend brunch availability"],
    icon: Users,
    id: 2
  }
];

export function FacilityMatch() {
  const [visibleMatches, setVisibleMatches] = useState<number[]>([]);

  useEffect(() => {
    matches.forEach((match, index) => {
      setTimeout(() => {
        setVisibleMatches(prev => [...prev, match.id]);
      }, index * 1200 + 3000);
    });
  }, []);

  return (
    <GlassPanel className="p-6">
      <h3 className="text-[#F5F1E8] mb-4 tracking-tight" style={{ fontFamily: 'Austin, serif', fontSize: '1.25rem', fontWeight: 300 }}>
        Facility Match Engine
      </h3>

      <div className="space-y-4">
        {matches.map((match) => (
          visibleMatches.includes(match.id) && (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-[#C8A96B]/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#C8A96B]/20 border border-[#C8A96B]/30 flex items-center justify-center">
                  <match.icon className="w-5 h-5 text-[#C8A96B]" />
                </div>
                <div>
                  <div className="text-[10px] text-[#F5F1E8]/50 mb-0.5" style={{ fontFamily: 'PP Neue Montreal, sans-serif', letterSpacing: '0.05em' }}>
                    INTEREST DETECTED
                  </div>
                  <div className="text-sm text-[#F5F1E8]" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                    {match.interest}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-[#C8A96B]/30 to-transparent" />
                <ArrowRight className="w-4 h-4 text-[#C8A96B]/50" />
                <div className="h-px flex-1 bg-gradient-to-l from-[#C8A96B]/30 to-transparent" />
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-[#C8A96B] mb-2" style={{ fontFamily: 'PP Neue Montreal, sans-serif', letterSpacing: '0.05em' }}>
                  MATCHED EXPERIENCES
                </div>
                {match.experience.map((exp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />
                    <span className="text-xs text-[#F5F1E8]/80" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                      {exp}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        ))}
      </div>
    </GlassPanel>
  );
}
