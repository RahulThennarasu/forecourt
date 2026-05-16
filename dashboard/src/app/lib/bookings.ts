/**
 * Live action routing for the Threshold dashboard.
 *
 * The Calendar and the Requests tab live in different parts of the tree, but
 * both need to react when a live call emits actions. This module is the
 * single point of truth: CallOrchestrationView calls ingestAction() with each
 * BackendAction + the call's metadata, and Calendar / RequestsView read the
 * resulting LiveBooking / LiveRequest arrays through useLiveBookings().
 *
 * Routing by action type:
 *   - dining_request          -> Calendar (if time parsed; payload.when carries it)
 *   - room_request            -> Calendar (if time parsed)
 *   - anticipatory_offer      -> Calendar (if time parsed; soft proposals usually have a time)
 *   - flag_for_staff          -> Requests; ALSO Calendar if a time was parsed
 *   - preference_note         -> Requests
 *
 * "If a time was parsed" means we scan the action's payload text for
 * recognisable hour strings ("7 pm", "10 pm to 10:15 pm", "tonight at 8").
 */
import { useEffect, useState } from 'react';
import { BackendAction, BackendActionType } from '@/app/lib/socket';

export interface LiveBooking {
  id: string;
  callSid: string;
  guestName: string;
  actionType: BackendActionType;
  title: string;
  detail?: string;
  // YYYY-MM-DD in local time. Defaults to today when the action's text gives
  // a clock time but no date.
  date: string;
  startHour: number;
  endHour: number;
  // Maps onto Calendar's existing CalEvent.type so the dot color + section
  // bucket stay consistent.
  category: 'dining' | 'spa' | 'stay' | 'vip';
}

export interface LiveRequest {
  id: string;
  callSid: string;
  guestName: string;
  actionType: BackendActionType;
  // Service slug for vendor-list lookup in RequestsView. Best-effort guess
  // when the request text is ambiguous; falls back to 'flag_for_staff'.
  service: string;
  summary: string;
  details: string[];
  requestedAt: number; // seconds into call
  // If the request also has a parsed time, surface it so RequestsView can
  // show the scheduled slot inline.
  date?: string;
  startHour?: number;
  endHour?: number;
}

const bookings: LiveBooking[] = [];
const requests: LiveRequest[] = [];
// Dedupe across the call_sid + payload identity. Demo callers retry the same
// turn occasionally; we don't want two dinners at 7 PM on the same call.
const seen = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Parse a single "7", "7:30", "7 pm", "7:30 p.m." into a fractional 24h hour.
// pmHint is used when no am/pm marker is present (e.g. the second half of
// "7 to 9 pm" inherits "pm" from its sibling).
function parseClockToken(
  token: string,
  pmHint: boolean | null,
): { hour: number; hadMeridiem: boolean } | null {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h < 0 || h > 23 || min < 0 || min >= 60) return null;
  let isPm: boolean | null = null;
  if (m[3]) isPm = /^p/i.test(m[3]);
  if (isPm === null) isPm = pmHint;
  if (isPm === null) {
    // No marker, no sibling — default by hour. 1–11 reads as PM in the demo
    // context (people don't usually order dinner at 7 AM); 12 stays 12; 0
    // stays 0.
    if (h >= 1 && h <= 11) isPm = true;
    else isPm = false;
  }
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return { hour: h + min / 60, hadMeridiem: m[3] !== undefined };
}

// Twilio STT often returns clock times without the colon ("10 15 pm" instead
// of "10:15 pm"). Pull those back into a parseable form before we run the
// main regex. Only matches when followed by an am/pm marker so we don't
// accidentally rewrite "I had 10 15 minutes".
function normalizeSpokenClock(text: string): string {
  return text
    .replace(/\b(\d{1,2})\s+(\d{2})\s*(a\.?m\.?|p\.?m\.?)\b/gi, '$1:$2 $3')
    // "ten fifteen PM" / "seven thirty PM" — leave alone, Claude usually
    // normalises numbers in payloads. Only the digit form needs the bridge.
    .replace(/\s{2,}/g, ' ');
}

// Scan free text for a clock range ("10 pm to 10:15 pm") or a single time
// ("7 pm", "tonight at 8"). Returns null if nothing recognisable.
export function parseTimeFromText(text: string): { startHour: number; endHour: number } | null {
  if (!text) return null;
  const t = normalizeSpokenClock(text).toLowerCase();

  // Try a range first. Allow "to", "until", "till", dashes (-, –, —), or
  // "through". The clock-token regex inside the range is permissive about
  // optional am/pm.
  const rangeRe =
    /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)\s*(?:to|until|till|through|-|–|—)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i;
  const rm = t.match(rangeRe);
  if (rm) {
    // Parse the right side first so we know whether am/pm was explicit; the
    // left side inherits it when ambiguous (10 to 10:15 pm -> both PM).
    const right = parseClockToken(rm[2], null);
    const left = parseClockToken(rm[1], right ? right.hour >= 12 : null);
    if (left && right) {
      let endHour = right.hour;
      // If end <= start, end probably crossed noon (e.g. "10 to 1 pm").
      if (endHour <= left.hour) endHour += 12;
      return { startHour: left.hour, endHour };
    }
  }

  // Single time. Match with required meridiem first (most reliable), then
  // fall back to bare hour preceded by "at".
  const singleWithMeridiem = t.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  if (singleWithMeridiem) {
    const parsed = parseClockToken(singleWithMeridiem[0], null);
    if (parsed) {
      return { startHour: parsed.hour, endHour: parsed.hour + 1 };
    }
  }
  const singleAt = t.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (singleAt) {
    const parsed = parseClockToken(singleAt[1] + (singleAt[2] ? `:${singleAt[2]}` : ''), null);
    if (parsed) {
      return { startHour: parsed.hour, endHour: parsed.hour + 1 };
    }
  }

  return null;
}

// Pull every text field worth scanning out of an action payload.
function payloadText(action: BackendAction): string {
  const p = (action.payload || {}) as Record<string, unknown>;
  const fields = ['when', 'request', 'note', 'proposal', 'recall', 'bridge', 'source_quote'];
  return fields.map((k) => (typeof p[k] === 'string' ? (p[k] as string) : '')).join(' · ');
}

function categoryFor(actionType: BackendActionType): LiveBooking['category'] {
  switch (actionType) {
    case 'dining_request':
      return 'dining';
    case 'room_request':
      return 'stay';
    case 'anticipatory_offer':
      return 'vip';
    case 'flag_for_staff':
      return 'vip';
    default:
      return 'stay';
  }
}

function titleFor(action: BackendAction, guestName: string): string {
  const p = (action.payload || {}) as Record<string, string>;
  switch (action.type) {
    case 'dining_request':
      return `${guestName} — ${p.request || 'Dining'}`;
    case 'room_request':
      return `${guestName} — ${p.request || 'Room request'}`;
    case 'anticipatory_offer':
      return `${guestName} — ${p.proposal || 'Anticipatory offer'}`;
    case 'flag_for_staff':
      return `${guestName} — ${p.note || 'Staff request'}`;
    case 'preference_note':
      return `${guestName} — ${p.note || 'Preference'}`;
    default:
      return `${guestName} — ${action.type}`;
  }
}

// Service classifier for the Requests tab. Conservative — falls through to a
// generic 'flag_for_staff' bucket so the card still renders even when the
// request doesn't match a known vendor category.
function serviceFor(action: BackendAction): string {
  const text = payloadText(action).toLowerCase();
  if (/firework|pyrotechnic|sparkler/i.test(text)) return 'fireworks';
  if (/photo|portrait/i.test(text)) return 'photography';
  if (/florist|flowers?|bouquet|petals?/i.test(text)) return 'florist';
  if (/car|driver|transport|airport/i.test(text)) return 'transport';
  if (/security|protection|escort/i.test(text)) return 'security';
  if (/babysit|nanny|child/i.test(text)) return 'childcare';
  if (/pet|dog|cat/i.test(text)) return 'pet care';
  if (/av|projector|microphone|boardroom/i.test(text)) return 'av';
  if (/chef|private dining|in-suite chef|wine steward/i.test(text)) return 'private dining';
  if (/recovery|compression|massage|therapy|normatec/i.test(text)) return 'sports therapy';
  return 'flag_for_staff';
}

function summaryFor(action: BackendAction): string {
  const p = (action.payload || {}) as Record<string, string>;
  return (
    p.note ||
    p.request ||
    p.proposal ||
    p.recall ||
    'Staff request from live call'
  );
}

function detailsFor(action: BackendAction): string[] {
  const p = (action.payload || {}) as Record<string, string>;
  const out: string[] = [];
  if (p.source_quote) out.push(`Guest said: "${p.source_quote}"`);
  if (p.when) out.push(`When: ${p.when}`);
  if (p.priority && action.type === 'flag_for_staff') out.push(`Priority: ${p.priority}`);
  if (p.recall && action.type === 'anticipatory_offer') out.push(`Recall: ${p.recall}`);
  if (p.bridge && action.type === 'anticipatory_offer') out.push(`Bridge: ${p.bridge}`);
  return out;
}

// Stable id from the call + action shape so the same Twilio retry won't add a
// duplicate row to either list.
function actionFingerprint(callSid: string, action: BackendAction): string {
  return `${callSid}::${action.type}::${JSON.stringify(action.payload || {})}`;
}

export interface IngestContext {
  callSid: string;
  guestName: string;
  // Used for the LiveRequest.requestedAt display. Optional — when missing
  // (e.g. an action arriving outside a turn), defaults to 0.
  turnTsSeconds?: number;
}

export function ingestAction(action: BackendAction, ctx: IngestContext): void {
  const fp = actionFingerprint(ctx.callSid, action);
  if (seen.has(fp)) return;
  seen.add(fp);

  const time = parseTimeFromText(payloadText(action));
  const idBase = `live_${ctx.callSid}_${ctx.turnTsSeconds ?? 0}_${action.type}_${seen.size}`;

  // ---- Calendar routing ----
  const calendarTypes: BackendActionType[] = [
    'dining_request',
    'room_request',
    'anticipatory_offer',
  ];
  const calendarOnTime: BackendActionType[] = ['flag_for_staff'];

  if (time && (calendarTypes.includes(action.type) || calendarOnTime.includes(action.type))) {
    bookings.push({
      id: `${idBase}_cal`,
      callSid: ctx.callSid,
      guestName: ctx.guestName,
      actionType: action.type,
      title: titleFor(action, ctx.guestName),
      detail: summaryFor(action),
      date: todayKey(),
      startHour: time.startHour,
      endHour: time.endHour,
      category: categoryFor(action.type),
    });
  }

  // ---- Requests routing ----
  if (action.type === 'flag_for_staff' || action.type === 'preference_note') {
    requests.push({
      id: `${idBase}_req`,
      callSid: ctx.callSid,
      guestName: ctx.guestName,
      actionType: action.type,
      service: serviceFor(action),
      summary: summaryFor(action),
      details: detailsFor(action),
      requestedAt: ctx.turnTsSeconds ?? 0,
      date: time ? todayKey() : undefined,
      startHour: time?.startHour,
      endHour: time?.endHour,
    });
  }

  emit();
}

// React hook — re-renders when either array changes. Returns the current
// snapshots; consumers must not mutate them.
export function useLiveBookings(): {
  bookings: readonly LiveBooking[];
  requests: readonly LiveRequest[];
} {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return { bookings, requests };
}

// Test / dev helper. Not used in production paths.
export function _resetLiveBookings(): void {
  bookings.length = 0;
  requests.length = 0;
  seen.clear();
  emit();
}
