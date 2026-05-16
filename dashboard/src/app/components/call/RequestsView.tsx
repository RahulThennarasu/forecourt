import { useMemo, useState } from 'react';
import { Activity, Car, Flower2, Monitor, PhoneCall } from 'lucide-react';
import { MOCK_REQUESTS, type RequestRecord } from '@/data/mockRequests';
import cventLogo from '@/assets/icons/cvent.png';

const CREAM_HIGHLIGHT = '#F3E5D3';
const FOREST_GREEN = '#0a3622';

type RequestCard = RequestRecord;

function formatCallTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function serviceMeta(service: string) {
  switch (service) {
    case 'sports therapy':
      return { label: 'sports therapy', banner: '#EAF4FF', icon: null as any };
    case 'transport':
      return { label: 'transport', banner: '#FFF6D6', icon: Car };
    case 'florist':
      return { label: 'florist', banner: '#F3E5D3', icon: Flower2 };
    case 'av':
      return { label: 'av', banner: '#F1E8DC', icon: Monitor };
    case 'security':
      return { label: 'security', banner: '#EAF4FF', icon: null as any };
    case 'childcare':
      return { label: 'childcare', banner: '#FFF6D6', icon: null as any };
    case 'photography':
      return { label: 'photography', banner: '#F3E5D3', icon: null as any };
    case 'pet care':
      return { label: 'pet care', banner: '#F1E8DC', icon: null as any };
    case 'private dining':
      return { label: 'private dining', banner: '#EAF4FF', icon: null as any };
    default:
      return { label: service, banner: '#EAF4FF', icon: PhoneCall };
  }
}

export function RequestsView() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cventStatusById, setCventStatusById] = useState<
    Record<string, 'idle' | 'adding' | 'added' | 'error'>
  >({});

  const cards = useMemo<RequestCard[]>(() => MOCK_REQUESTS, []);

  return (
    <div className="flex-1 overflow-y-auto px-10 py-10" style={{ background: '#FFFFFF' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.875rem', color: '#000000' }}>
            Requests routes work to local partners (Menlo Park / Peninsula) with quick-call lists.
          </p>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            alignItems: 'start',
          }}
        >
          {cards.map((c) => {
            const meta = serviceMeta(c.service);
            const Icon = meta.icon;
            const expanded = expandedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setExpandedId(c.id)}
                className="text-left border border-[#E5E5E5] hover:border-[#D6D6D6] transition-colors"
                style={{
                  borderRadius: 14,
                  padding: 12,
                  background: '#FFFFFF',
                  minHeight: 168,
                }}
              >
                {/* flat banner */}
                <div aria-hidden style={{ height: 26, borderRadius: 10, background: meta.banner, marginBottom: 10 }} />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      style={{
                        fontFamily: 'PP Neue Montreal, sans-serif',
                        fontSize: '0.6875rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#000000',
                        display: 'inline-block',
                        background: CREAM_HIGHLIGHT,
                        border: '1px solid #E6C9A8',
                        borderRadius: 999,
                        padding: '2px 8px',
                        marginBottom: 8,
                      }}
                    >
                      {meta.label}
                    </p>

                    <p
                      style={{
                        fontFamily: 'PP Neue Montreal, sans-serif',
                        fontSize: '0.95rem',
                        color: FOREST_GREEN,
                        lineHeight: 1.25,
                        marginBottom: 8,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {c.summary}
                    </p>

                    <p style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.75rem', color: '#000000', opacity: 0.7 }}>
                      {c.requestedBy} · {formatCallTime(c.requestedAt)}
                    </p>
                  </div>
                </div>
              </button>
          );
          })}
        </div>

        {/* Expanded modal */}
        {expandedId ? (
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.35)' }}
            onClick={() => setExpandedId(null)}
          >
            {(() => {
              const c = cards.find((x) => x.id === expandedId);
              if (!c) return null;
              const meta = serviceMeta(c.service);
              const Icon = meta.icon;
              return (
                <div
                  className="bg-white border border-[#E8E4DA] shadow-xl"
                  style={{
                    width: 780,
                    maxWidth: 'calc(100vw - 48px)',
                    margin: '8vh auto',
                    borderRadius: 16,
                    padding: 18,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div aria-hidden style={{ height: 40, borderRadius: 12, background: meta.banner, marginBottom: 12 }} />
                      <div className="min-w-0">
                          <p
                            style={{
                              fontFamily: 'PP Neue Montreal, sans-serif',
                              fontSize: '0.75rem',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: '#000000',
                              display: 'inline-block',
                              background: CREAM_HIGHLIGHT,
                              border: '1px solid #E6C9A8',
                              borderRadius: 999,
                              padding: '2px 8px',
                              marginBottom: 8,
                            }}
                          >
                            {meta.label}
                          </p>
                          <p style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '1.15rem', color: FOREST_GREEN }}>
                            {c.summary}
                          </p>
                          <p style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.875rem', color: '#000000', opacity: 0.65, marginTop: 6 }}>
                            {c.requestedBy} · {formatCallTime(c.requestedAt)}
                          </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const status = cventStatusById[c.id] ?? 'idle';
                          if (status === 'adding' || status === 'added') return;
                          setCventStatusById((prev) => ({ ...prev, [c.id]: 'adding' }));
                          try {
                            const payload = {
                              provider: 'cvent',
                              hotel: 'Rosewood Sand Hill',
                              request_id: c.id,
                              service: c.service,
                              summary: c.summary,
                              requested_by: c.requestedBy,
                              requested_at: c.requestedAt,
                              details: c.details ?? [],
                              vendors: c.vendors,
                            };
                            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                            setCventStatusById((prev) => ({ ...prev, [c.id]: 'added' }));
                          } catch {
                            setCventStatusById((prev) => ({ ...prev, [c.id]: 'error' }));
                          }
                        }}
                        className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 44,
                          height: 32,
                          padding: 0,
                          borderRadius: 6,
                          background:
                            (cventStatusById[c.id] ?? 'idle') === 'added'
                              ? 'rgba(10, 54, 34, 0.06)'
                              : '#FFFFFF',
                        }}
                        title={
                          (cventStatusById[c.id] ?? 'idle') === 'adding'
                            ? 'Adding to Cvent…'
                            : (cventStatusById[c.id] ?? 'idle') === 'added'
                              ? 'Added to Cvent'
                              : (cventStatusById[c.id] ?? 'idle') === 'error'
                                ? 'Retry Cvent'
                                : 'Add to Cvent'
                        }
                      >
                        <img
                          src={cventLogo}
                          alt=""
                          style={{
                            width: 26,
                            height: 26,
                            objectFit: 'contain',
                            opacity: (cventStatusById[c.id] ?? 'idle') === 'adding' ? 0.55 : 0.95,
                            filter: (cventStatusById[c.id] ?? 'idle') === 'added' ? 'saturate(1.05)' : 'none',
                          }}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
                        style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.75rem', borderRadius: 3 }}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <p
                    style={{
                      fontFamily: 'PP Neue Montreal, sans-serif',
                      fontSize: '0.8125rem',
                      color: '#000000',
                      opacity: 0.6,
                      marginTop: 10,
                    }}
                  >
                    “Add to Cvent” copies a Cvent-ready payload to your clipboard (mock integration).
                  </p>

                  {c.details?.length ? (
                    <ul className="mt-5 space-y-1.5" style={{ paddingLeft: 16 }}>
                      {c.details.map((d, idx) => (
                        <li key={idx} style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.95rem', color: '#000000', opacity: 0.85 }}>
                          {d}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-6">
                    <p
                      style={{
                        fontFamily: 'PP Neue Montreal, sans-serif',
                        fontSize: '0.6875rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#000000',
                        opacity: 0.6,
                        marginBottom: 10,
                      }}
                    >
                      Local places to call
                    </p>
                    <div className="space-y-2">
                      {c.vendors.map((v) => (
                        <div key={`${c.id}-${v.name}`} className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.9375rem', color: '#000000' }}>
                              <span style={{ background: CREAM_HIGHLIGHT, borderRadius: 6, padding: '2px 6px' }}>{v.name}</span>
                            </p>
                            <p style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.8125rem', color: '#000000', opacity: 0.65 }}>
                              {v.area}
                              {v.notes ? ` · ${v.notes}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <PhoneCall className="w-4 h-4" style={{ color: FOREST_GREEN, strokeWidth: 1.75 }} />
                            <a
                              href={`tel:${v.phone.replace(/[^\d+]/g, '')}`}
                              style={{
                                fontFamily: 'PP Neue Montreal, sans-serif',
                                fontSize: '0.875rem',
                                color: FOREST_GREEN,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {v.phone}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
