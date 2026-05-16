import { motion } from 'motion/react';
import { Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  guestName: string;
  phoneNumber: string;
  // Wall-clock timestamp (Date.now() ms) of when call_started arrived.
  // null means no call is active — timer reads 00:00.
  startedAtMs: number | null;
  // Wall-clock timestamp of call_ended. When set, the timer freezes at the
  // final duration and the status switches to "Call Ended".
  endedAtMs?: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CallHeader({ guestName, phoneNumber, startedAtMs, endedAtMs = null }: Props) {
  // Tick every 250ms so the displayed second updates without drift — elapsed
  // is computed from wall clock each render, so a missed tick never lags.
  // When the call has ended, stop ticking (the value is frozen anyway).
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAtMs === null || endedAtMs !== null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAtMs, endedAtMs]);

  const callTime =
    startedAtMs === null
      ? 0
      : endedAtMs !== null
        ? Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000))
        : Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

  const ended = endedAtMs !== null;

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-8"
      style={{ height: '72px', background: '#FFFFFF' }}
    >
      {/* Left: Status */}
      <div className="flex items-center gap-2" style={{ minWidth: 140 }}>
        {ended ? (
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#C7CED4' }}
          />
        ) : (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#9BCFEF' }}
          />
        )}
        <p
          className="text-xs font-medium tracking-wide uppercase"
          style={{
            color: '#6E7E8C',
            fontFamily: 'PP Neue Montreal, sans-serif',
            fontSize: '0.5rem',
            letterSpacing: '0.12em',
          }}
        >
          {ended ? 'Call Ended' : 'In Call'}
        </p>
        <p
          className="text-xs"
          style={{
            color: '#8EA1B1',
            fontFamily: 'PP Neue Montreal, sans-serif',
            fontSize: '0.75rem',
          }}
        >
          · {formatTime(callTime)}
        </p>
      </div>

      {/* Center: Guest Name */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex-1 flex justify-center"
      >
        <div className="text-center">
          <p
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '1.375rem',
              fontWeight: 300,
              color: '#1E2A35',
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}
          >
            {guestName}
          </p>
        </div>
      </motion.div>

      {/* Right: Phone */}
      <div className="flex items-center gap-2 justify-end" style={{ minWidth: 140 }}>
        <Phone className="w-3 h-3" style={{ color: '#A2B3C1', strokeWidth: 1.5 }} />
        <p
          className="text-xs"
          style={{
            color: '#8EA1B1',
            fontFamily: 'PP Neue Montreal, sans-serif',
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
          }}
        >
          {phoneNumber}
        </p>
      </div>
    </div>
  );
}
