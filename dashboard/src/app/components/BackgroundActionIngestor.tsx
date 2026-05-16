import { useEffect, useRef } from 'react';
import { useThresholdSocket } from '@/app/lib/socket';
import { ingestAction } from '@/app/lib/bookings';

/**
 * App-level WebSocket consumer that pipes every agent_turn's actions into the
 * shared bookings store. This must mount above the page switcher so it stays
 * connected when the user navigates away from Live (e.g. to Calendar) during
 * an active call — otherwise we'd miss the agent_turn that carries the
 * dinner reservation or fireworks request.
 *
 * Renders nothing. Pure side-effect glue.
 *
 * CallOrchestrationView opens its own socket for UI updates (status, last
 * event); the duplicate connection is fine for the demo and ingestAction's
 * fingerprint dedupe prevents double-recording the same action.
 */
export function BackgroundActionIngestor() {
  const { last } = useThresholdSocket();
  const guestByCallRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!last) return;
    if (last.type === 'call_started') {
      guestByCallRef.current.set(last.call_sid, last.guest_name || 'Guest');
      return;
    }
    if (last.type === 'agent_turn') {
      const actions = Array.isArray(last.actions) ? last.actions : [];
      if (actions.length === 0) return;
      const guestName = guestByCallRef.current.get(last.call_sid) || 'Guest';
      for (const a of actions) {
        ingestAction(a, {
          callSid: last.call_sid,
          guestName,
          turnTsSeconds: last.ts_seconds,
        });
      }
    }
  }, [last]);

  return null;
}
