/**
 * Live WebSocket connection to the Threshold backend at /ws.
 *
 * Events from voice.py:
 *   - call_started  { call_sid, guest_name, phone_suffix }
 *   - turn          { call_sid, turn_number, ts_seconds, guest_speech, agent_say, actions[], leaks[] }
 *   - action        { call_sid, action: { type, payload } }   // per-action stream (duplicates of `turn.actions`)
 *   - leak_guard    { call_sid, labels[] }
 *
 * URL is configurable via VITE_WS_URL; defaults to ws://localhost:8000/ws.
 * Auto-reconnects with a 2s backoff. Keeps a single open connection per page.
 */
import { useEffect, useRef, useState } from 'react';

export type BackendActionType =
  | 'room_request'
  | 'dining_request'
  | 'preference_note'
  | 'anticipatory_offer'
  | 'flag_for_staff';

export interface BackendAction {
  type: BackendActionType;
  payload: Record<string, unknown>;
}

export type SocketEvent =
  | {
      type: 'call_started';
      call_sid: string;
      guest_name: string;
      phone_suffix: string;
    }
  | {
      type: 'turn';
      call_sid: string;
      turn_number: number;
      // Kept for back-compat; equals guest_ts_seconds.
      ts_seconds: number;
      // Wall-clock-relative timestamps (seconds since call_started):
      // guest_ts = when the guest stopped speaking; agent_ts = when the
      // agent's audio is ready to play.
      guest_ts_seconds: number;
      agent_ts_seconds: number;
      guest_speech: string;
      agent_say: string;
      actions: BackendAction[];
      leaks: string[];
    }
  | {
      type: 'action';
      call_sid: string;
      action: BackendAction;
    }
  | {
      type: 'leak_guard';
      call_sid: string;
      labels: string[];
    }
  | {
      type: 'call_ended';
      call_sid: string;
      ts_seconds: number;
      reason: 'guest_closed' | string;
    };

type ConnectionStatus = 'connecting' | 'open' | 'closed';

const DEFAULT_URL = 'ws://localhost:8000/ws';

function getWsUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.VITE_WS_URL || DEFAULT_URL;
}

/**
 * Subscribe to backend events. Returns the latest event, the connection
 * status, and the full ordered list since this hook mounted.
 *
 * Usage: a single component mounts the hook and routes events into local state.
 * Multiple mounts would open multiple sockets — fine for the demo, but should
 * be hoisted into a provider for production.
 */
export function useThresholdSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [last, setLast] = useState<SocketEvent | null>(null);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;
      setStatus('connecting');
      const ws = new WebSocket(getWsUrl());
      socketRef.current = ws;

      ws.addEventListener('open', () => {
        if (cancelled) return;
        setStatus('open');
      });

      ws.addEventListener('message', (ev: MessageEvent<string>) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(ev.data) as SocketEvent;
          setLast(data);
          setEvents((prev) => [...prev, data]);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[ws] non-JSON message dropped', err);
        }
      });

      ws.addEventListener('close', () => {
        if (cancelled) return;
        setStatus('closed');
        retry = setTimeout(connect, 2000);
      });

      ws.addEventListener('error', () => {
        // Errors are followed by close; let close drive reconnection.
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      socketRef.current?.close();
    };
  }, []);

  return { status, last, events };
}
