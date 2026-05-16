import { motion } from "motion/react";
import { GlassPanel } from "./GlassPanel";
import { useEffect, useState } from "react";

const preferences = [
  "Vegetarian preference",
  "Quiet seating",
  "Anniversary weekend",
  "Returning guest since 2023",
  "Wine enthusiast",
  "Prefers cool room temperature"
];

export function GuestIntelligence() {
  const [visiblePrefs, setVisiblePrefs] = useState<string[]>([]);

  useEffect(() => {
    preferences.forEach((pref, index) => {
      setTimeout(() => {
        setVisiblePrefs(prev => [...prev, pref]);
      }, index * 600 + 1000);
    });
  }, []);

  return (
    <GlassPanel className="p-6">
      <h3 className="text-[#F5F1E8] mb-4 tracking-tight" style={{ fontFamily: 'Austin, serif', fontSize: '1.25rem', fontWeight: 300 }}>
        Guest Intelligence
      </h3>

      <div className="flex flex-wrap gap-2">
        {visiblePrefs.map((pref, index) => (
          <motion.div
            key={pref}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg hover:bg-white/[0.08] transition-colors"
          >
            <span className="text-xs text-[#F5F1E8]/80" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
              {pref}
            </span>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}
