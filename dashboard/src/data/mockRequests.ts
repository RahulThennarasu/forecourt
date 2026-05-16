export type Vendor = {
  name: string;
  phone: string;
  area: string;
  notes?: string;
};

export type RequestRecord = {
  id: string;
  service: string;
  summary: string;
  details?: string[];
  vendors: Vendor[];
  requestedBy: string;
  requestedAt: number; // seconds into call (or timeline)
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

export const MOCK_REQUESTS: RequestRecord[] = [
  {
    id: 'req-ava-security',
    service: 'security',
    summary: 'Discrete security detail for a late-night arrival',
    details: ['One plainclothes agent at porte cochère', 'Escort to suite if requested', 'No visible staging in lobby'],
    vendors: MENLO_VENDORS.security,
    requestedBy: 'Ava Chen',
    requestedAt: 35,
  },
  {
    id: 'req-tanaka-childcare',
    service: 'childcare',
    summary: 'Babysitting coverage during dinner reservation',
    details: ['2 children (ages 4 & 7)', 'In-room games + bedtime routine', 'Confirm allergies + emergency contact'],
    vendors: MENLO_VENDORS.childcare,
    requestedBy: 'Mr. & Mrs. Tanaka',
    requestedAt: 41,
  },
  {
    id: 'req-sofia-photo',
    service: 'photography',
    summary: 'Golden-hour couple portraits on property',
    details: ['30-minute shoot', 'Courtyard + Vista Lawn options', 'Deliver 10 selects same day'],
    vendors: MENLO_VENDORS.photography,
    requestedBy: 'Sofia Martinez',
    requestedAt: 52,
  },
  {
    id: 'req-jordan-pet',
    service: 'pet care',
    summary: 'Pet sitting / walking service while guest is in meetings',
    details: ['Dog: small breed', 'Two walks (midday + evening)', 'Coordinate access with concierge'],
    vendors: MENLO_VENDORS['pet care'],
    requestedBy: 'Jordan Patel',
    requestedAt: 58,
  },
  {
    id: 'req-lena-private-dining',
    service: 'private dining',
    summary: 'In-suite private chef tasting + wine steward',
    details: ['4 guests', 'Start anytime after 8:30 PM', 'Quiet service (no announcements)'],
    vendors: MENLO_VENDORS['private dining'],
    requestedBy: 'Lena Kim',
    requestedAt: 66,
  },
];

