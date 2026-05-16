import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Action,
  ActionCategory,
  Keyword,
  KeywordType,
  LogEntry,
} from '@/data/mockCallData';
import {
  BackendAction,
  BackendActionType,
  SocketEvent,
  useThresholdSocket,
} from '@/app/lib/socket';
import { CallRecord, fetchCalls } from '@/app/lib/api';
import { CallHeader } from './CallHeader';
import { OrchestrationLog } from './OrchestrationLog';

interface LiveCallState {
  status: 'waiting' | 'in_progress' | 'ended';
  callSid: string | null;
  guestName: string;
  phoneNumber: string;
  // Wall-clock anchor (Date.now() at call_started) so CallHeader can compute
  // accurate elapsed time. null when no call is active.
  startedAtMs: number | null;
  // Wall-clock anchor (Date.now() at call_ended) — when set, CallHeader
  // freezes the timer at the final duration.
  endedAtMs: number | null;
  entries: LogEntry[];
  leakLabels: string[];
}

const EMPTY: LiveCallState = {
  status: 'waiting',
  callSid: null,
  guestName: '—',
  phoneNumber: '—',
  startedAtMs: null,
  endedAtMs: null,
  entries: [],
  leakLabels: [],
};

// Lightweight keyword highlighting on the guest's speech. Keeps the dashboard
// visually rich without an NLP pipeline — the categories mirror the system
// prompt's trigger taxonomy (emotional / logistical / constraint / preference).
const KEYWORD_RULES: Array<{ pattern: RegExp; type: KeywordType }> = [
  { pattern: /\banniversar\w*\b/i, type: 'occasion' },
  { pattern: /\bbirthday\b/i, type: 'occasion' },
  { pattern: /\bcelebrat\w*\b/i, type: 'occasion' },
  { pattern: /\bmilestone\b/i, type: 'occasion' },
  { pattern: /\bengagement\b/i, type: 'occasion' },
  { pattern: /\bflight\b/i, type: 'logistical' },
  { pattern: /\barriv\w*\b/i, type: 'logistical' },
  { pattern: /\btomorrow\b/i, type: 'logistical' },
  { pattern: /\btonight\b/i, type: 'logistical' },
  { pattern: /\bafternoon\b/i, type: 'logistical' },
  { pattern: /\bmorning\b/i, type: 'logistical' },
  { pattern: /\bquiet\b/i, type: 'constraint' },
  { pattern: /\bvegetarian\b/i, type: 'constraint' },
  { pattern: /\bvegan\b/i, type: 'constraint' },
  { pattern: /\ballerg\w*\b/i, type: 'constraint' },
  { pattern: /\bwine\b/i, type: 'preference' },
  { pattern: /\bdinner\b/i, type: 'preference' },
  { pattern: /\bbreakfast\b/i, type: 'preference' },
  { pattern: /\blong flight\b/i, type: 'logistical' },
];

function extractKeywords(text: string | undefined | null): Keyword[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: Keyword[] = [];
  for (const rule of KEYWORD_RULES) {
    const m = text.match(rule.pattern);
    if (m && !seen.has(m[0].toLowerCase())) {
      seen.add(m[0].toLowerCase());
      out.push({ word: m[0], type: rule.type, highlighted: true });
    }
  }
  return out;
}

const ACTION_CATEGORY: Record<BackendActionType, ActionCategory> = {
  room_request: 'room',
  dining_request: 'dining',
  preference_note: 'amenity',
  anticipatory_offer: 'facility',
  flag_for_staff: 'amenity',
};

const ACTION_TITLE: Record<BackendActionType, string> = {
  room_request: 'Room request',
  dining_request: 'Dining request',
  preference_note: 'Preference note',
  anticipatory_offer: 'Anticipatory offer',
  flag_for_staff: 'Staff flag',
};

function actionText(a: BackendAction): string {
  const p = a.payload || {};
  switch (a.type) {
    case 'anticipatory_offer':
      return String(p.proposal || p.recall || 'Anticipatory offer logged');
    case 'room_request':
      return String(p.request || 'Room request logged');
    case 'dining_request': {
      const when = p.when ? ` · ${String(p.when)}` : '';
      return `${String(p.request || 'Dining request logged')}${when}`;
    }
    case 'preference_note':
      return String(p.note || 'Preference noted');
    case 'flag_for_staff':
      return String(p.note || 'Staff flag');
    default:
      return JSON.stringify(p);
  }
}

function mapAction(a: BackendAction, idx: number, sid: string, turn: number): Action {
  // Extra fields (type, title) are read by OrchestrationLog's SubSteps renderer
  // even though they aren't in the Action interface — match what the mock data
  // actually carries.
  return {
    id: `${sid}_${turn}_${idx}`,
    text: actionText(a),
    category: ACTION_CATEGORY[a.type] ?? 'amenity',
    status: 'executed',
    type: 'tool',
    title: ACTION_TITLE[a.type] ?? a.type,
  } as Action & { type: string; title: string };
}

// Build a partial entry from a guest_turn — guest bubble only, no decision
// or actions yet. The matching agent_turn fills those in later.
function buildGuestEntry(ev: Extract<SocketEvent, { type: 'guest_turn' }>): LogEntry {
  return {
    id: `${ev.call_sid}_${ev.turn_number}`,
    timestamp: ev.ts_seconds,
    guestMessage: {
      text: ev.speech || '',
      keywords: extractKeywords(ev.speech),
    },
    reasoning: [],
    actions: [],
    // decision deliberately undefined — applyAgentTurn populates it when the
    // matching agent_turn event arrives.
  };
}

// Merge an agent_turn into the existing partial entry: synthesise the
// reasoning waterfall, attach the decision block, map actions.
function applyAgentTurn(
  entry: LogEntry,
  ev: Extract<SocketEvent, { type: 'agent_turn' }>,
): LogEntry {
  const agentSay = ev.say || '';
  const actions = Array.isArray(ev.actions) ? ev.actions : [];
  const leaks = Array.isArray(ev.leaks) ? ev.leaks : [];
  const hasOffer = actions.some((a) => a.type === 'anticipatory_offer');
  const wasGuarded = leaks.length > 0;

  const reasoning: LogEntry['reasoning'] = [];
  if (hasOffer) {
    const offer = actions.find((a) => a.type === 'anticipatory_offer');
    const p = (offer?.payload || {}) as Record<string, string>;
    if (p.recall) {
      reasoning.push({
        type: 'memory_recall',
        title: 'memory recall',
        description: p.recall,
        details: [],
        text: p.recall,
      } as LogEntry['reasoning'][number] & { text: string });
    }
    if (p.bridge) {
      reasoning.push({
        type: 'context_bridge',
        title: 'context bridge',
        description: p.bridge,
        details: [],
        text: p.bridge,
      } as LogEntry['reasoning'][number] & { text: string });
    }
  }
  if (wasGuarded) {
    reasoning.push({
      type: 'synthesis_complete',
      title: 'leak guard activated',
      description: `Replaced with deflection: ${leaks.join(', ')}`,
      details: leaks,
      text: `Held back: ${leaks.join(', ')}`,
    } as LogEntry['reasoning'][number] & { text: string });
  }

  return {
    ...entry,
    reasoning,
    decision: {
      type: hasOffer ? 'offer' : 'confirmation',
      text: agentSay,
      importance: wasGuarded || hasOffer ? 'critical' : 'standard',
      title: hasOffer ? 'anticipatory offer' : 'response',
      timestamp: ev.ts_seconds,
    } as LogEntry['decision'] & { title: string; timestamp: number },
    actions: actions.map((a, i) => mapAction(a, i, ev.call_sid, ev.turn_number)),
  };
}

function maskedPhone(suffix: string): string {
  const s = (suffix || '').padStart(4, '•').slice(-4);
  return `+1 (•••) •••-${s}`;
}

function formatCallTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  if (isYesterday) return `Yesterday, ${time}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })}, ${time}`;
}

function formatDuration(call: CallRecord): string {
  if (!call.ended_at) return 'in progress';
  const start = new Date(call.started_at).getTime();
  const end = new Date(call.ended_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return '—';
  const totalSec = Math.round((end - start) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function CallOrchestrationView() {
  const [callState, setCallState] = useState<LiveCallState>(EMPTY);
  const [pastCalls, setPastCalls] = useState<CallRecord[]>([]);
  const { status, last } = useThresholdSocket();

  // Initial fetch — show whatever's already in the DB when the page loads.
  useEffect(() => {
    let cancelled = false;
    fetchCalls()
      .then((calls) => {
        if (!cancelled) setPastCalls(calls);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[calls] initial fetch failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refetch when a call ends so the new one shows up at the top of the list.
  useEffect(() => {
    if (last?.type !== 'call_ended') return;
    fetchCalls()
      .then(setPastCalls)
      .catch((err) => console.warn('[calls] refetch failed', err));
  }, [last]);

  useEffect(() => {
    if (!last) return;

    if (last.type === 'call_started') {
      setCallState((prev) => {
        // Idempotent: Twilio sometimes fires /voice twice per call (Primary +
        // Fallback URL, or retry on slow response). Don't wipe the timeline
        // mid-call when the second event arrives with the same CallSid.
        if (prev.callSid === last.call_sid && prev.status === 'in_progress') {
          return prev;
        }
        return {
          status: 'in_progress',
          callSid: last.call_sid,
          guestName: last.guest_name,
          phoneNumber: maskedPhone(last.phone_suffix),
          startedAtMs: Date.now(),
          endedAtMs: null,
          entries: [],
          leakLabels: [],
        };
      });
      return;
    }

    if (last.type === 'call_ended') {
      setCallState((prev) => {
        if (prev.callSid !== last.call_sid) return prev;
        return { ...prev, status: 'ended', endedAtMs: Date.now() };
      });
      return;
    }

    if (last.type === 'guest_turn') {
      const entry = buildGuestEntry(last);
      setCallState((prev) => {
        if (prev.callSid && prev.callSid !== last.call_sid) return prev;
        const nextStatus = prev.status === 'ended' ? 'ended' : 'in_progress';
        // De-dupe: if a guest_turn for this id is already present (e.g. the
        // backend retried), don't append a second.
        if (prev.entries.some((e) => e.id === entry.id)) return prev;
        return {
          ...prev,
          status: nextStatus,
          callSid: prev.callSid || last.call_sid,
          startedAtMs: prev.startedAtMs ?? Date.now(),
          entries: [...prev.entries, entry],
        };
      });
      return;
    }

    if (last.type === 'agent_turn') {
      setCallState((prev) => {
        if (prev.callSid && prev.callSid !== last.call_sid) return prev;
        const targetId = `${last.call_sid}_${last.turn_number}`;
        let touched = false;
        const updated = prev.entries.map((entry) => {
          if (entry.id !== targetId) return entry;
          touched = true;
          return applyAgentTurn(entry, last);
        });
        // Defensive: if the matching guest_turn was missed (e.g. server
        // restart, or dashboard tab opened after the call started), synthesise
        // a placeholder guest row so the agent_turn isn't orphaned.
        if (!touched) {
          const placeholder: LogEntry = {
            id: targetId,
            timestamp: last.ts_seconds,
            guestMessage: { text: '(speech not captured)', keywords: [] },
            reasoning: [],
            actions: [],
          };
          updated.push(applyAgentTurn(placeholder, last));
        }
        return { ...prev, entries: updated };
      });
      return;
    }

    if (last.type === 'leak_guard') {
      setCallState((prev) => ({
        ...prev,
        leakLabels: [...prev.leakLabels, ...last.labels],
      }));
    }
  }, [last]);

  if (callState.status === 'waiting') {
    return (
      <div className="h-full overflow-hidden flex flex-col" style={{ background: '#F5FAFF' }}>
        <CallHeader guestName="Waiting" phoneNumber="—" startedAtMs={null} endedAtMs={null} />
        <div className="flex-1 overflow-y-auto px-10 py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <div className="text-center mb-12">
              <p
                style={{
                  fontFamily: 'Cormorant Garamond, Georgia, serif',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: '#1E2A35',
                  marginBottom: 8,
                }}
              >
                Waiting for an incoming call
              </p>
              <p
                style={{
                  fontFamily: 'PP Neue Montreal, sans-serif',
                  fontSize: '0.8125rem',
                  color: '#8EA1B1',
                }}
              >
                websocket {status} · ready when the line rings
              </p>
            </div>

            {pastCalls.length > 0 ? (
              <div>
                <p
                  className="uppercase"
                  style={{
                    fontFamily: 'PP Neue Montreal, sans-serif',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.14em',
                    color: '#6E7E8C',
                    marginBottom: 14,
                  }}
                >
                  Recent calls
                </p>
                <ul className="space-y-2">
                  {pastCalls.map((call) => (
                    <li
                      key={call.call_sid}
                      className="flex items-baseline justify-between gap-4 rounded-xl px-4 py-3"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5EAF0',
                      }}
                    >
                      <div className="min-w-0">
                        <p
                          style={{
                            fontFamily: 'Cormorant Garamond, Georgia, serif',
                            fontSize: '1.0625rem',
                            color: '#1E2A35',
                            lineHeight: 1.25,
                          }}
                        >
                          {call.guest_name}
                        </p>
                        <p
                          style={{
                            fontFamily: 'PP Neue Montreal, sans-serif',
                            fontSize: '0.75rem',
                            color: '#8EA1B1',
                            marginTop: 2,
                          }}
                        >
                          {formatCallTime(call.started_at)}
                          {call.phone_suffix ? ` · ${'•••-'}${call.phone_suffix}` : ''}
                        </p>
                      </div>
                      <p
                        className="flex-shrink-0"
                        style={{
                          fontFamily: 'PP Neue Montreal, sans-serif',
                          fontSize: '0.75rem',
                          color: call.ended_at ? '#6E7E8C' : '#9BCFEF',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {formatDuration(call)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col" style={{ background: '#F5FAFF' }}>
      <CallHeader
        guestName={callState.guestName}
        phoneNumber={callState.phoneNumber}
        startedAtMs={callState.startedAtMs}
        endedAtMs={callState.endedAtMs}
      />
      <OrchestrationLog entries={callState.entries} />
    </div>
  );
}
