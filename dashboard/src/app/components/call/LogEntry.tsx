import { motion } from 'motion/react';
import { LogEntry as LogEntryType } from '@/data/mockCallData';
import { GuestMessage } from './GuestMessage';
import { ReasoningBlockComponent } from './ReasoningBlock';
import { DecisionBlock } from './DecisionBlock';
import { ActionsSection } from './ActionsSection';

interface Props {
  entry: LogEntryType;
  entryIndex: number;
}

export function LogEntry({ entry, entryIndex }: Props) {
  // Stagger timing for visual progression
  const baseDelay = entryIndex * 0.1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: baseDelay }}
      className="pb-12 last:pb-0"
      style={{ borderBottom: '1px solid #F0EBE5' }}
    >
      {/* Guest Message */}
      <GuestMessage
        text={entry.guestMessage.text}
        keywords={entry.guestMessage.keywords}
        timestamp={entry.timestamp}
      />

      {/* Reasoning blocks - cascading waterfall */}
      {entry.reasoning.length > 0 && (
        <motion.div className="mt-6 space-y-3">
          {entry.reasoning.map((reasoning, i) => (
            <ReasoningBlockComponent
              key={i}
              reasoning={reasoning}
              delay={baseDelay + 0.25 + i * 0.12}
            />
          ))}
        </motion.div>
      )}

      {/* Decision */}
      {entry.decision && (
        <DecisionBlock
          decision={entry.decision}
          delay={baseDelay + 0.25 + entry.reasoning.length * 0.12 + 0.1}
        />
      )}

      {/* Actions */}
      {entry.actions.length > 0 && (
        <ActionsSection
          actions={entry.actions}
          delay={baseDelay + 0.25 + entry.reasoning.length * 0.12 + (entry.decision ? 0.25 : 0.1)}
        />
      )}
    </motion.div>
  );
}
