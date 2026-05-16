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
import {
  CallActionRecord,
  CallDetail,
  CallRecord,
  fetchCallDetail,
  fetchCalls,
} from '@/app/lib/api';
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

// The dashboard has three views inside this page. 'live' is the default and
// shows the active call (or waiting placeholder when nothing's ringing).
// 'list' is the full past-calls list reachable via the back arrow during a
// call. 'history' replays one specific finished call.
type ViewMode = 'live' | 'list' | 'history';

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

function maskedPhone(suffix: string | null | undefined): string {
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

// Convert a persisted CallDetail (metadata + turns + actions) into LogEntry[]
// so the history view can reuse OrchestrationLog. Turns are grouped by
// turn_number; actions are attached to the entry with the closest agent ts.
function entriesFromDetail(detail: CallDetail): LogEntry[] {
  type Group = { guestText?: string; guestTs?: number; agentText?: string; agentTs?: number };
  const groups = new Map<number, Group>();
  for (const t of detail.turns) {
    const g = groups.get(t.turn_number) || {};
    if (t.role === 'guest') {
      g.guestText = t.text;
      g.guestTs = t.ts_seconds;
    } else {
      g.agentText = t.text;
      g.agentTs = t.ts_seconds;
    }
    groups.set(t.turn_number, g);
  }
  const nums = Array.from(groups.keys()).sort((a, b) => a - b);
  const entries: LogEntry[] = nums.map((n) => {
    const g = groups.get(n)!;
    const ts = g.guestTs ?? g.agentTs ?? 0;
    const entry: LogEntry = {
      id: `${detail.call_sid}_${n}`,
      timestamp: ts,
      guestMessage: {
        text: g.guestText || '(speech not captured)',
        keywords: extractKeywords(g.guestText),
      },
      reasoning: [],
      actions: [],
    };
    if (g.agentText) {
      const titledType = detail.actions.some((a) => a.type === 'anticipatory_offer')
        ? undefined
        : 'response';
      entry.decision = {
        type: 'confirmation',
        text: g.agentText,
        importance: 'standard',
        title: titledType || 'response',
        timestamp: g.agentTs ?? ts,
      } as LogEntry['decision'] & { title: string; timestamp: number };
    }
    return entry;
  });

  // Attach actions to the entry whose agent ts is closest to the action's
  // relative time. Falls back to the last entry if we can't compute. Demo
  // accuracy is fine — actions are visible somewhere in the timeline.
  if (entries.length === 0) return entries;
  const startedMs = new Date(detail.started_at).getTime();
  function targetForAction(a: CallActionRecord): LogEntry {
    const aMs = new Date(a.ts).getTime();
    if (!Number.isFinite(aMs) || !Number.isFinite(startedMs)) {
      return entries[entries.length - 1];
    }
    const aRel = Math.max(0, Math.floor((aMs - startedMs) / 1000));
    let best = entries[0];
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const e of entries) {
      const eTs =
        (e.decision as { timestamp?: number } | undefined)?.timestamp ?? e.timestamp;
      const diff = Math.abs(eTs - aRel);
      if (diff < bestDiff) {
        best = e;
        bestDiff = diff;
      }
    }
    return best;
  }
  detail.actions.forEach((a, idx) => {
    const target = targetForAction(a);
    const wrapped: BackendAction = {
      type: a.type as BackendActionType,
      payload: a.payload,
    };
    target.actions = [
      ...target.actions,
      mapAction(wrapped, idx, detail.call_sid, idx + 1),
    ];
    if (a.type === 'anticipatory_offer') {
      const p = (a.payload || {}) as Record<string, string>;
      if (target.decision) {
        (target.decision as LogEntry['decision'] & { title: string }).title =
          'anticipatory offer';
        (target.decision as LogEntry['decision']).type = 'offer';
        (target.decision as LogEntry['decision']).importance = 'critical';
      }
      if (p.recall) {
        target.reasoning.push({
          type: 'memory_recall',
          title: 'memory recall',
          description: p.recall,
          details: [],
          text: p.recall,
        } as LogEntry['reasoning'][number] & { text: string });
      }
      if (p.bridge) {
        target.reasoning.push({
          type: 'context_bridge',
          title: 'context bridge',
          description: p.bridge,
          details: [],
          text: p.bridge,
        } as LogEntry['reasoning'][number] & { text: string });
      }
    }
  });
  return entries;
}

// PastCallsList renders the standard recent-calls panel used both in the
// waiting state (compact, after the placeholder copy) and in the dedicated
// 'list' view (header above, no placeholder). Rows are clickable to open the
// per-call history view.
function PastCallsList({
  calls,
  onSelectCall,
}: {
  calls: CallRecord[];
  onSelectCall: (sid: string) => void;
}) {
  if (calls.length === 0) {
    return (
      <p
        style={{
          fontFamily: 'PP Neue Montreal, sans-serif',
          fontSize: '0.8125rem',
          color: '#8EA1B1',
        }}
      >
        No calls yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {calls.map((call) => (
        <li key={call.call_sid}>
          <button
            type="button"
            onClick={() => onSelectCall(call.call_sid)}
            className="w-full text-left flex items-baseline justify-between gap-4 rounded-xl px-4 py-3 transition-colors"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5EAF0',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#9BCFEF';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5EAF0';
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
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CallOrchestrationView() {
  const [callState, setCallState] = useState<LiveCallState>(EMPTY);
  const [pastCalls, setPastCalls] = useState<CallRecord[]>([]);
  const { status, last } = useThresholdSocket();

  // Navigation across live / list / history. selectedCallSid + historyReturnTo
  // are only meaningful when viewMode === 'history'.
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [selectedCallSid, setSelectedCallSid] = useState<string | null>(null);
  const [historyReturnTo, setHistoryReturnTo] = useState<ViewMode>('live');
  const [historyDetail, setHistoryDetail] = useState<CallDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Load full detail when entering the history view for a specific call.
  useEffect(() => {
    if (viewMode !== 'history' || !selectedCallSid) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryDetail(null);
    fetchCallDetail(selectedCallSid)
      .then((d) => {
        if (!cancelled) setHistoryDetail(d);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[history] fetch failed', err);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedCallSid]);

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
      // Live-call dashboard state only. Action routing into Calendar +
      // Requests stores happens in <BackgroundActionIngestor /> at the App
      // level, so it works regardless of which page is currently mounted.
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

  function openHistory(sid: string, returnTo: ViewMode) {
    setSelectedCallSid(sid);
    setHistoryReturnTo(returnTo);
    setViewMode('history');
  }

  function backFromHistory() {
    setSelectedCallSid(null);
    setHistoryDetail(null);
    setViewMode(historyReturnTo);
  }

  const hasActiveCall = callState.status === 'in_progress';

  // ---- View: history (replay of one past call) ----
  if (viewMode === 'history') {
    const detail = historyDetail;
    const entries = detail ? entriesFromDetail(detail) : [];
    const startedMs = detail ? new Date(detail.started_at).getTime() : null;
    const endedMs = detail?.ended_at ? new Date(detail.ended_at).getTime() : null;
    return (
      <div className="h-full overflow-hidden flex flex-col" style={{ background: '#F5FAFF' }}>
        <CallHeader
          guestName={detail?.guest_name || (historyLoading ? 'Loading…' : 'Call')}
          phoneNumber={maskedPhone(detail?.phone_suffix)}
          startedAtMs={Number.isFinite(startedMs) ? startedMs : null}
          endedAtMs={Number.isFinite(endedMs) ? endedMs : null}
          onBack={backFromHistory}
          backLabel={historyReturnTo === 'list' ? 'All calls' : 'Back'}
        />
        {historyLoading || !detail ? (
          <div className="flex-1 flex items-center justify-center">
            <p
              style={{
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.875rem',
                color: '#8EA1B1',
              }}
            >
              {historyLoading ? 'Loading…' : 'Call not found.'}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p
              style={{
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.875rem',
                color: '#8EA1B1',
              }}
            >
              No transcript on file for this call.
            </p>
          </div>
        ) : (
          <OrchestrationLog entries={entries} />
        )}
      </div>
    );
  }

  // ---- View: list (all past calls) ----
  if (viewMode === 'list') {
    return (
      <div className="h-full overflow-hidden flex flex-col" style={{ background: '#F5FAFF' }}>
        <CallHeader
          guestName="All calls"
          phoneNumber={`${pastCalls.length} on file`}
          startedAtMs={null}
          endedAtMs={null}
          onBack={() => setViewMode('live')}
          backLabel={hasActiveCall ? 'Return to live' : 'Live view'}
        />
        <div className="flex-1 overflow-y-auto px-10 py-10">
          <div className="max-w-2xl mx-auto">
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
              Past calls
            </p>
            <PastCallsList
              calls={pastCalls}
              onSelectCall={(sid) => openHistory(sid, 'list')}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---- View: live, waiting placeholder ----
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
                <PastCallsList
                  calls={pastCalls}
                  onSelectCall={(sid) => openHistory(sid, 'live')}
                />
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    );
  }

  // ---- View: live, in progress / ended ----
  return (
    <div className="h-full overflow-hidden flex flex-col" style={{ background: '#F5FAFF' }}>
      <CallHeader
        guestName={callState.guestName}
        phoneNumber={callState.phoneNumber}
        startedAtMs={callState.startedAtMs}
        endedAtMs={callState.endedAtMs}
        onBack={() => setViewMode('list')}
        backLabel="All calls"
      />
      <OrchestrationLog entries={callState.entries} />
    </div>
  );
}
