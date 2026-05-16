import { motion, AnimatePresence } from 'motion/react';
import { Action, ActionCategory } from '@/data/mockCallData';

const categoryColorMap: Record<ActionCategory, string> = {
  room: '#1B3A2D',
  dining: '#A07850',
  amenity: '#5A5EA0',
  facility: '#4A8C5C',
};

interface Props {
  actions: Action[];
  delay?: number;
}

export function ActionsSection({ actions, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="pl-4 border-l-2 space-y-2"
      style={{
        borderColor: '#A8A09F',
      }}
    >
      <p
        className="text-xs font-medium tracking-wide uppercase"
        style={{
          color: '#A8A09F',
          fontFamily: 'PP Neue Montreal, sans-serif',
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          marginBottom: '12px',
        }}
      >
        Actions
      </p>

      <AnimatePresence>
        {actions.map((action, i) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3, delay: delay + i * 0.08 }}
            className="flex items-start gap-3"
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
              style={{ background: categoryColorMap[action.category] }}
            />
            <p
              className="text-sm flex-1 leading-relaxed"
              style={{
                color: '#5A5450',
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.8125rem',
                lineHeight: '1.5',
              }}
            >
              {action.text}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
