import { useEffect, useState } from 'react';
import { CallHeader } from './call/CallHeader';
import { OrchestrationLog } from './call/OrchestrationLog';
import { mockCallDataPhilip } from '@/data/mockCallData.philip';
import type { CallState } from '@/data/mockCallData';

export function LiveCallView() {
  const [callState, setCallState] = useState<CallState>({
    ...(mockCallDataPhilip as any),
    entries: [],
  });

  // Simulate entries appearing over time
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const entries: any[] = (mockCallDataPhilip as any).entries ?? [];

    entries.forEach((entry, i) => {
      const timer = setTimeout(() => {
        setCallState((prev) => ({
          ...prev,
          entries: [...prev.entries, entry],
        }));
      }, (entry.timestamp ?? i * 4) * 1000 + 500);

      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="h-full overflow-hidden flex flex-col" style={{ background: '#FFFFFF' }}>
      <CallHeader
        guestName={callState.guestName}
        phoneNumber={callState.phoneNumber}
        callStartTime={callState.startTime}
      />

      <OrchestrationLog entries={callState.entries} />
    </div>
  );
}
