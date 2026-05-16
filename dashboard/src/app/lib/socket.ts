/**
 * Live WebSocket connection to the Threshold backend at /ws.
 *
 * Events from voice.py:
 *   - call_started  { call_sid, guest_name, phone_suffix }
 *   - guest_turn    { call_sid, turn_number, ts_seconds, speech }
 *   - agent_turn    { call_sid, turn_number, ts_seconds, say, actions[], leaks[] }
 *   - action        { call_sid, action: { type, payload } }   // per-action stream
 *   - leak_guard    { call_sid, labels[] }
 *   - call_ended    { call_sid, ts_seconds, reason }
 *
 * The server also emits app-level {type:"ping"} every 25s to keep proxies /
 * ngrok from closing the socket as idle. The hook discards those silently —
 * they never become `last` and never trigger a re-render.
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
      // Fired the moment Twilio's transcript reaches the server — before
      // Claude has been called. Dashboard renders the guest bubble now and
      // waits for the matching agent_turn (same turn_number) to fill in the
      // reply. guest_name is included so subscribers that mounted after
      // call_started still know who's on the line.
      type: 'guest_turn';
      call_sid: string;
      guest_name?: string;
      turn_number: number;
      ts_seconds: number;
      speech: string;
    }
  | {
      // Fired after Claude has produced a response, the leak guard has run,
      // and ElevenLabs has finished synthesising the audio. Carries the same
      // turn_number as its sibling guest_turn so the view fills in the same
      // row instead of appending a new one. guest_name lets the bookings
      // ingestor label live actions correctly even on a late mount.
      type: 'agent_turn';
      call_sid: string;
      guest_name?: string;
      turn_number: number;
      ts_seconds: number;
      say: string;
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
 * Subscribe to backend events. Returns the latest event and the connection
 * status. The event log is deliberately NOT accumulated here — only `last` is
 * tracked, which halves the re-renders per message and removed a flickering
 * symptom caused by every consumer receiving a new `events` array reference
 * on every WS message.
 *
 * Usage: a single component mounts the hook and routes events into local state.
 * Multiple mounts would open multiple sockets — fine for the demo, but should
 * be hoisted into a provider for production.
 */
export function useThresholdSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [last, setLast] = useState<SocketEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;
      setStatus((prev) => (prev === 'connecting' ? prev : 'connecting'));
      const ws = new WebSocket(getWsUrl());
      socketRef.current = ws;

      ws.addEventListener('open', () => {
        if (cancelled) return;
        setStatus((prev) => (prev === 'open' ? prev : 'open'));
      });

      ws.addEventListener('message', (ev: MessageEvent<string>) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(ev.data) as SocketEvent & { type?: string };
          // Server-side keep-alive — discard without triggering a render.
          if (data && data.type === 'ping') return;
          setLast(data as SocketEvent);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[ws] non-JSON message dropped', err);
        }
      });

      ws.addEventListener('close', () => {
        if (cancelled) return;
        setStatus((prev) => (prev === 'closed' ? prev : 'closed'));
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

  return { status, last };
}
