import { motion } from 'motion/react';
import { ReasoningBlock as ReasoningBlockType } from '@/data/mockCallData';

const colorMap = {
  occasion_detected: '#A07850',
  memory_recall: '#1B3A2D',
  context_bridge: '#5A5EA0',
  synthesis_complete: '#4A8C5C',
  preference_match: '#4A8C5C',
};

const bgMap = {
  occasion_detected: '#F2ECE3',
  memory_recall: '#E8EEE9',
  context_bridge: '#E8E9F2',
  synthesis_complete: '#ECEFEA',
  preference_match: '#ECEFEA',
};

interface Props {
  reasoning: ReasoningBlockType;
  delay: number;
}

export function ReasoningBlockComponent({ reasoning, delay }: Props) {
  const color = colorMap[reasoning.type];
  const bg = bgMap[reasoning.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="pl-4 border-l-2"
      style={{
        borderColor: color,
      }}
    >
      <div className="space-y-2">
        <p
          className="text-sm font-medium tracking-wide"
          style={{
            color,
            fontFamily: 'PP Neue Montreal, sans-serif',
            fontSize: '0.625rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {reasoning.title}
        </p>

        <p
          className="text-sm"
          style={{
            color: '#5A5450',
            fontFamily: 'PP Neue Montreal, sans-serif',
            lineHeight: '1.6',
            fontSize: '0.9375rem',
          }}
        >
          {reasoning.description}
        </p>

        {reasoning.details.length > 0 && (
          <ul className="space-y-1.5 pt-2">
            {reasoning.details.map((detail, i) => (
              <li
                key={i}
                className="text-xs flex items-start gap-2"
                style={{ color: '#8B7D75', fontFamily: 'PP Neue Montreal, sans-serif' }}
              >
                <span className="text-xs mt-0.5 flex-shrink-0" style={{ color }}>
                  ◆
                </span>
                <span style={{ fontSize: '0.8125rem' }}>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
