import { useMemo, useState } from 'react';
import { Activity, Car, Flower2, Monitor, PhoneCall } from 'lucide-react';
import { mockCallDataPhilip } from '@/data/mockCallData.philip';

const CREAM_HIGHLIGHT = '#F3E5D3';
const FOREST_GREEN = '#0a3622';

type Vendor = {
  name: string;
  phone: string;
  area: string;
  notes?: string;
};

type RequestCard = {
  id: string;
  service: string;
  summary: string;
  details?: string[];
  vendors: Vendor[];
  requestedBy: string;
  requestedAt: number; // seconds into call
};

const MENLO_VENDORS: Record<string, Vendor[]> = {
  'sports therapy': [
    { name: 'On-Site Sports Therapy (Menlo Park)', phone: '+1 (650) 555-0199', area: 'Menlo Park', notes: 'Mobile recovery setup · same-day delivery' },
    { name: 'Peninsula Recovery Studio', phone: '+1 (650) 555-0177', area: 'Menlo Park', notes: 'Compression boots · assisted stretch' },
    { name: 'Palo Alto Sports Therapy Labs', phone: '+1 (650) 555-0133', area: 'Palo Alto', notes: 'Medical-grade recovery · invoice-ready' },
  ],
  transport: [
    { name: 'Rosewood Town Car Desk', phone: '+1 (650) 555-0100', area: 'Rosewood', notes: 'Within 5-mile radius · priority dispatch' },
    { name: 'Peninsula Executive Car', phone: '+1 (650) 555-0128', area: 'Menlo Park', notes: 'Airport runs · hourly charter' },
  ],
  florist: [
    { name: 'Menlo Florals', phone: '+1 (650) 555-0156', area: 'Menlo Park', notes: 'Same-day arrangements · suite setup' },
    { name: 'Atherton Garden Studio', phone: '+1 (650) 555-0164', area: 'Atherton', notes: 'Luxury centerpieces · events' },
  ],
  av: [
    { name: 'Peninsula AV & Events', phone: '+1 (650) 555-0148', area: 'Menlo Park', notes: 'Boardroom setups · mic/projector' },
  ],
  security: [
    { name: 'Peninsula Executive Security', phone: '+1 (650) 555-0116', area: 'Menlo Park', notes: 'Discrete detail · venue screening' },
    { name: 'Bay Area Close Protection', phone: '+1 (650) 555-0186', area: 'Palo Alto', notes: 'VIP escort · event coverage' },
  ],
  childcare: [
    { name: 'Menlo Park Nannies', phone: '+1 (650) 555-0122', area: 'Menlo Park', notes: 'Background-checked · evening coverage' },
    { name: 'Peninsula Babysitting Co.', phone: '+1 (650) 555-0151', area: 'Atherton', notes: 'Hotel-experienced sitters' },
  ],
  photography: [
    { name: 'Peninsula Portrait Studio', phone: '+1 (650) 555-0138', area: 'Menlo Park', notes: 'On-property shoots · 2-hour blocks' },
    { name: 'Bay Area Event Photo', phone: '+1 (650) 555-0168', area: 'Palo Alto', notes: 'Candid coverage · same-day selects' },
  ],
  'pet care': [
    { name: 'Menlo Pet Concierge', phone: '+1 (650) 555-0174', area: 'Menlo Park', notes: 'In-suite visits · walking service' },
    { name: 'Peninsula Vet On-Call', phone: '+1 (650) 555-0109', area: 'Palo Alto', notes: 'After-hours support' },
  ],
  'private dining': [
    { name: 'Peninsula Private Chef Network', phone: '+1 (650) 555-0144', area: 'Menlo Park', notes: 'In-suite chef service · tasting menus' },
    { name: 'Wine Steward On-Call', phone: '+1 (650) 555-0192', area: 'Atherton', notes: 'Pairing + bottle sourcing' },
  ],
};

function normalizeServiceFromText(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('normatec') || t.includes('compression') || t.includes('recovery')) return 'sports therapy';
  if (t.includes('car') || t.includes('transport') || t.includes('driving')) return 'transport';
  if (t.includes('floral') || t.includes('flowers')) return 'florist';
  if (t.includes('av') || t.includes('projector') || t.includes('microphone') || t.includes('boardroom')) return 'av';
  if (t.includes('security') || t.includes('protection')) return 'security';
  if (t.includes('child') || t.includes('babysit') || t.includes('nanny')) return 'childcare';
  if (t.includes('photo') || t.includes('portrait')) return 'photography';
  if (t.includes('pet') || t.includes('dog') || t.includes('cat')) return 'pet care';
  if (t.includes('private dining') || t.includes('chef')) return 'private dining';
  return 'sports therapy';
}

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

  const cards = useMemo<RequestCard[]>(() => {
    const entries: any[] = (mockCallDataPhilip as any)?.entries ?? [];
    const guestName: string = (mockCallDataPhilip as any)?.guestName ?? 'Guest';
    const requestCards: RequestCard[] = [];

    for (const entry of entries) {
      const reasoning: any[] = entry?.reasoning ?? [];
      const outside = reasoning.find((r) => r?.type === 'outside_service_bridge');
      if (outside) {
        const summary = outside.description || 'Outside service needed';
        const details = Array.isArray(outside.details) ? outside.details : [];
        const service = normalizeServiceFromText(`${outside.title ?? ''} ${outside.description ?? ''} ${details.join(' ')}`);
        requestCards.push({
          id: `req-${entry.id}`,
          service,
          summary,
          details,
          vendors: MENLO_VENDORS[service] ?? [],
          requestedBy: guestName,
          requestedAt: entry?.timestamp ?? 0,
        });
      }
    }

    // If no outside-service cards exist yet (early in call playback), show a few
    // Rosewood-style request templates so the tab isn’t empty.
    if (requestCards.length === 0) {
      requestCards.push(
        {
          id: 'req-template-transport',
          service: 'transport',
          summary: 'Town car / driver coordination',
          details: ['Confirm pickup window', 'Route: Rosewood Sand Hill ⇄ Palo Alto', 'Add corporate billing note if needed'],
          vendors: MENLO_VENDORS.transport,
          requestedBy: guestName,
          requestedAt: 0,
        },
        {
          id: 'req-template-florist',
          service: 'florist',
          summary: 'Floral arrangement / in-room setup',
          details: ['Suite delivery', 'Card message', 'Preferred palette (neutral / seasonal)'],
          vendors: MENLO_VENDORS.florist,
          requestedBy: guestName,
          requestedAt: 0,
        },
      );
    }

    // Extra mock requests (different people + different services) for demo density.
    requestCards.push(
      {
        id: 'req-mock-security-1',
        service: 'security',
        summary: 'Discrete security detail for a late-night arrival',
        details: ['One plainclothes agent at porte cochère', 'Escort to suite if requested', 'No visible staging in lobby'],
        vendors: MENLO_VENDORS.security,
        requestedBy: 'Ava Chen',
        requestedAt: 35,
      },
      {
        id: 'req-mock-childcare-1',
        service: 'childcare',
        summary: 'Babysitting coverage during dinner reservation',
        details: ['2 children (ages 4 & 7)', 'In-room games + bedtime routine', 'Confirm any allergies + emergency contact'],
        vendors: MENLO_VENDORS.childcare,
        requestedBy: 'Mr. & Mrs. Tanaka',
        requestedAt: 41,
      },
      {
        id: 'req-mock-photo-1',
        service: 'photography',
        summary: 'Golden-hour couple portraits on property',
        details: ['30-minute shoot', 'Courtyard + Vista Lawn options', 'Deliver 10 selects same day'],
        vendors: MENLO_VENDORS.photography,
        requestedBy: 'Sofia Martinez',
        requestedAt: 52,
      },
      {
        id: 'req-mock-pet-1',
        service: 'pet care',
        summary: 'Pet sitting / walking service while guest is in meetings',
        details: ['Dog: small breed', 'Two walks (midday + evening)', 'Coordinate access with concierge'],
        vendors: MENLO_VENDORS['pet care'],
        requestedBy: 'Jordan Patel',
        requestedAt: 58,
      },
      {
        id: 'req-mock-private-dining-1',
        service: 'private dining',
        summary: 'In-suite private chef tasting + wine steward',
        details: ['4 guests', 'Start anytime after 8:30 PM', 'Quiet service (no announcements)'],
        vendors: MENLO_VENDORS['private dining'],
        requestedBy: 'Lena Kim',
        requestedAt: 66,
      },
    );

    return requestCards;
  }, []);

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

                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="px-3 py-1 border border-[#E0DBD0] hover:bg-[#F7F5F0] transition-colors text-[#666]"
                      style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.75rem', borderRadius: 3 }}
                    >
                      Close
                    </button>
                  </div>

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
