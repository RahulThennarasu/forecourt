/**
 * HTTP API helpers for the Threshold backend.
 *
 * Base URL is configurable via VITE_API_URL; defaults to http://localhost:8000
 * to match local development. Set VITE_API_URL when the backend is exposed
 * via a different host (e.g. an ngrok tunnel during a remote demo).
 */

export interface CallRecord {
  call_sid: string;
  guest_name: string;
  phone_suffix: string | null;
  started_at: string; // ISO 8601 UTC
  ended_at: string | null;
  ended_reason: string | null;
}

const DEFAULT_BASE = 'http://localhost:8000';

function getApiBase(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.VITE_API_URL || DEFAULT_BASE;
}

export async function fetchCalls(limit = 50): Promise<CallRecord[]> {
  const url = `${getApiBase()}/calls?limit=${encodeURIComponent(String(limit))}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetchCalls: HTTP ${r.status}`);
  const data = (await r.json()) as { calls: CallRecord[] };
  return data.calls || [];
}
