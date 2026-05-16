import { motion } from "motion/react";
import { GlassPanel } from "./GlassPanel";
import { Phone } from "lucide-react";
import { useEffect, useState } from "react";

interface Message {
  role: "guest" | "concierge";
  text: string;
  id: number;
}

const conversationScript: Message[] = [
  { role: "guest", text: "Hello, I'm calling about my reservation this evening.", id: 1 },
  { role: "concierge", text: "Good afternoon, Mr. Tanaka. Welcome back. I see you're arriving from Tokyo on UA241.", id: 2 },
  { role: "guest", text: "Yes, that's right. It's our anniversary weekend.", id: 3 },
  { role: "concierge", text: "How wonderful. Congratulations. I've noted that and prepared something special for your arrival.", id: 4 },
  { role: "guest", text: "We'd love a quiet table at Madera around 7pm if possible.", id: 5 },
  { role: "concierge", text: "Of course. I've reserved a corner table on the patio for 7pm with your preferred Sancerre chilled.", id: 6 },
];

export function LiveCall() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    conversationScript.forEach((msg, index) => {
      setTimeout(() => {
        setMessages(prev => [...prev, msg]);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 1500);
      }, index * 3000);
    });
  }, []);

  return (
    <GlassPanel className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[#F5F1E8] tracking-tight" style={{ fontFamily: 'Austin, serif', fontSize: '1.5rem', fontWeight: 300 }}>
          Active Guest Call
        </h2>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#C8A96B]/20 rounded-full border border-[#C8A96B]/30"
        >
          <div className="w-2 h-2 rounded-full bg-[#C8A96B]" style={{ boxShadow: '0 0 8px #C8A96B' }} />
          <span className="text-xs text-[#C8A96B]" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>Call Active</span>
        </motion.div>
      </div>

      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.08]">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C8A96B]/30 to-[#C8A96B]/10 border border-[#C8A96B]/30 flex items-center justify-center overflow-hidden">
          <div className="text-2xl text-[#F5F1E8]" style={{ fontFamily: 'Austin, serif' }}>T</div>
        </div>
        <div className="flex-1">
          <h3 className="text-[#F5F1E8] mb-1" style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '1.125rem' }}>
            Mr. Tanaka
          </h3>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#C8A96B]/10 rounded-full border border-[#C8A96B]/20">
            <span className="text-xs text-[#C8A96B]" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>Returning Guest</span>
          </div>
        </div>
      </div>

      <div className="mb-4 px-3 py-2.5 bg-black/20 rounded-lg border border-white/[0.05]">
        <div className="text-xs text-[#F5F1E8]/60 mb-1" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>Flight Information</div>
        <div className="text-sm text-[#F5F1E8]" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
          UA241 • Tokyo → SFO • ETA 4:32 PM
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex ${msg.role === 'guest' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
              msg.role === 'guest'
                ? 'bg-[#C8A96B]/20 border border-[#C8A96B]/30'
                : 'bg-white/[0.05] border border-white/[0.08]'
            }`}>
              <div className="text-xs text-[#F5F1E8]/50 mb-1" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                {msg.role === 'guest' ? 'Guest' : 'Concierge AI'}
              </div>
              <p className="text-sm text-[#F5F1E8]" style={{ fontFamily: 'PP Neue Montreal, sans-serif', lineHeight: '1.5' }}>
                {msg.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg"
        >
          <Phone className="w-4 h-4 text-[#C8A96B]" />
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-[#C8A96B] rounded-full"
                animate={{ height: [4, 12, 4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
          <span className="text-xs text-[#F5F1E8]/60" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>Speaking...</span>
        </motion.div>
      )}
    </GlassPanel>
  );
}
