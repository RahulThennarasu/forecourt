import { useEffect, useRef } from 'react';
import { useThresholdSocket } from '@/app/lib/socket';
import { ingestAction, ingestGuest } from '@/app/lib/bookings';

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
    // Any event that carries a guest_name updates the call->name map. This
    // covers the case where the dashboard mounted AFTER call_started fired —
    // the very next guest_turn or agent_turn will populate the name so
    // downstream rows don't fall back to the generic "Guest" label.
    const carriedName =
      'guest_name' in last && typeof last.guest_name === 'string'
        ? last.guest_name
        : null;
    if (carriedName && 'call_sid' in last && typeof last.call_sid === 'string') {
      guestByCallRef.current.set(last.call_sid, carriedName);
    }

    // Roster: anyone who has shown up on a live call this session lands in
    // the Guests page. call_started carries the phone suffix; later events
    // don't, but they at least keep the name pinned via ingestGuest's dedup.
    if (last.type === 'call_started') {
      ingestGuest(last.call_sid, last.guest_name || 'Guest', last.phone_suffix || '');
    } else if (carriedName && 'call_sid' in last && typeof last.call_sid === 'string') {
      ingestGuest(last.call_sid, carriedName, '');
    }

    if (last.type === 'agent_turn') {
      const actions = Array.isArray(last.actions) ? last.actions : [];
      if (actions.length === 0) return;
      const guestName =
        guestByCallRef.current.get(last.call_sid) || carriedName || 'Guest';
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
