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
import { CallHeader } from './CallHeader';
import { OrchestrationLog } from './OrchestrationLog';

interface LiveCallState {
  status: 'waiting' | 'in_progress' | 'ended';
  callSid: string | null;
  guestName: string;
  phoneNumber: string;
  startTime: number;
  entries: LogEntry[];
  leakLabels: string[];
}

const EMPTY: LiveCallState = {
  status: 'waiting',
  callSid: null,
  guestName: '—',
  phoneNumber: '—',
  startTime: 0,
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

function extractKeywords(text: string): Keyword[] {
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

function buildEntry(ev: Extract<SocketEvent, { type: 'turn' }>): LogEntry {
  const keywords = extractKeywords(ev.guest_speech);
  const hasOffer = ev.actions.some((a) => a.type === 'anticipatory_offer');
  const wasGuarded = ev.leaks.length > 0;

  // Synthesize the "thinking" track only when something interesting happened
  // — keeps routine confirmations clean.
  const reasoning: LogEntry['reasoning'] = [];
  if (hasOffer) {
    const offer = ev.actions.find((a) => a.type === 'anticipatory_offer');
    const p = (offer?.payload || {}) as Record<string, string>;
    if (p.recall) {
      reasoning.push({
        type: 'memory_recall',
        title: 'memory recall',
        description: p.recall,
        details: [],
        // extra fields rendered by SubSteps:
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
      description: `Replaced with deflection: ${ev.leaks.join(', ')}`,
      details: ev.leaks,
      text: `Held back: ${ev.leaks.join(', ')}`,
    } as LogEntry['reasoning'][number] & { text: string });
  }

  return {
    id: `${ev.call_sid}_${ev.turn_number}`,
    timestamp: ev.ts_seconds,
    guestMessage: {
      text: ev.guest_speech,
      keywords,
    },
    reasoning,
    decision: {
      type: hasOffer ? 'offer' : 'confirmation',
      text: ev.agent_say,
      importance: wasGuarded || hasOffer ? 'critical' : 'standard',
      // extra field rendered by OrchestrationLog as decision title:
      title: hasOffer ? 'anticipatory offer' : 'response',
    } as LogEntry['decision'] & { title: string },
    actions: ev.actions.map((a, i) => mapAction(a, i, ev.call_sid, ev.turn_number)),
  };
}

function maskedPhone(suffix: string): string {
  const s = (suffix || '').padStart(4, '•').slice(-4);
  return `+1 (•••) •••-${s}`;
}

export function CallOrchestrationView() {
  const [callState, setCallState] = useState<LiveCallState>(EMPTY);
  const { status, last } = useThresholdSocket();

  useEffect(() => {
    if (!last) return;

    if (last.type === 'call_started') {
      setCallState({
        status: 'in_progress',
        callSid: last.call_sid,
        guestName: last.guest_name,
        phoneNumber: maskedPhone(last.phone_suffix),
        startTime: 0,
        entries: [],
        leakLabels: [],
      });
      return;
    }

    if (last.type === 'turn') {
      const entry = buildEntry(last);
      setCallState((prev) => {
        // Ignore turns from a different call — defensive against late events
        // arriving after a new call has started.
        if (prev.callSid && prev.callSid !== last.call_sid) return prev;
        return {
          ...prev,
          status: 'in_progress',
          callSid: prev.callSid || last.call_sid,
          entries: [...prev.entries, entry],
        };
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
        <CallHeader guestName="Waiting" phoneNumber="—" callStartTime={0} />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
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
        callStartTime={callState.startTime}
      />
      <OrchestrationLog entries={callState.entries} />
    </div>
  );
}
