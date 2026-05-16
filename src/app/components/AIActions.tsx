import { motion, AnimatePresence } from "motion/react";
import { GlassPanel } from "./GlassPanel";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Action {
  text: string;
  id: number;
  timestamp: string;
}

const actions: Action[] = [
  { text: "Requested corner suite", id: 1, timestamp: "2:34 PM" },
  { text: "Triggered anniversary experience", id: 2, timestamp: "2:35 PM" },
  { text: "Logged Sancerre preference", id: 3, timestamp: "2:35 PM" },
  { text: "Suggested patio jazz seating", id: 4, timestamp: "2:36 PM" },
  { text: "Coordinated welcome amenity", id: 5, timestamp: "2:36 PM" },
  { text: "Notified sommelier team", id: 6, timestamp: "2:37 PM" }
];

export function AIActions() {
  const [visibleActions, setVisibleActions] = useState<Action[]>([]);

  useEffect(() => {
    actions.forEach((action, index) => {
      setTimeout(() => {
        setVisibleActions(prev => [...prev, action]);
      }, index * 1000 + 2000);
    });
  }, []);

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#C8A96B]" />
        <h3 className="text-[#F5F1E8] tracking-tight" style={{ fontFamily: 'Austin, serif', fontSize: '1.25rem', fontWeight: 300 }}>
          AI Actions
        </h3>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
        <AnimatePresence>
          {visibleActions.map((action) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3 p-3 bg-black/20 rounded-lg border border-white/[0.05] hover:bg-black/30 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C8A96B] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#F5F1E8]" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                  {action.text}
                </p>
                <p className="text-xs text-[#F5F1E8]/40 mt-1" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                  {action.timestamp}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassPanel>
  );
}
