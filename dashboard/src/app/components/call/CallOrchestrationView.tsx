import { useEffect, useState } from 'react';
import { mockCallData, LogEntry as LogEntryType, CallState } from '@/data/mockCallData';
import { CallHeader } from './CallHeader';
import { OrchestrationLog } from './OrchestrationLog';

export function CallOrchestrationView() {
  const [callState, setCallState] = useState<CallState>({
    ...mockCallData,
    entries: [],
  });

  // Simulate entries appearing over time
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    mockCallData.entries.forEach((entry, i) => {
      const timer = setTimeout(() => {
        setCallState((prev) => ({
          ...prev,
          entries: [...prev.entries, entry],
        }));
      }, entry.timestamp * 1000 + 500);

      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="h-full overflow-hidden flex flex-col" style={{ background: '#F5FAFF' }}>
      <CallHeader
        guestName={callState.guestName}
        phoneNumber={callState.phoneNumber}
        callStartTime={callState.startTime}
      />

      <OrchestrationLog entries={callState.entries} />
    </div>
  );
}
