import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogEntry as LogEntryType } from '@/data/mockCallData';
import { LogEntry } from './LogEntry';

interface Props {
  entries: LogEntryType[];
}

export function OrchestrationLog({ entries }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new entries appear
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [entries.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      style={{
        background: '#FFFBF8',
        scrollbarWidth: 'thin',
        scrollbarColor: '#E5DDD0 transparent',
      }}
    >
      <div className="max-w-2xl mx-auto px-12 py-10">
        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center"
          >
            <p
              style={{
                color: '#D0CAC2',
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.875rem',
              }}
            >
              Connecting…
            </p>
          </motion.div>
        ) : (
          entries.map((entry, i) => (
            <LogEntry key={entry.id} entry={entry} entryIndex={i} />
          ))
        )}
      </div>
    </div>
  );
}
