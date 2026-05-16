import { motion } from 'motion/react';
import { Decision } from '@/data/mockCallData';

interface Props {
  decision: Decision;
  delay: number;
}

export function DecisionBlock({ decision, delay }: Props) {
  const isOffer = decision.type === 'offer';
  const color = isOffer ? '#A07850' : '#1B3A2D';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="pl-4 border-l-2 my-4"
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
          {isOffer ? 'Concierge Offers' : 'Confirmed'}
        </p>

        <p
          className="leading-relaxed"
          style={{
            color: '#3A3430',
            fontFamily: 'PP Neue Montreal, sans-serif',
            fontSize: '0.9375rem',
            lineHeight: '1.65',
            fontStyle: 'italic',
          }}
        >
          "{decision.text}"
        </p>
      </div>
    </motion.div>
  );
}
