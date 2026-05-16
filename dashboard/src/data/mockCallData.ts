export type KeywordType = 'occasion' | 'logistical' | 'constraint' | 'preference';
export type ReasoningType =
  | 'occasion_detected'
  | 'memory_recall'
  | 'context_bridge'
  | 'preference_match'
  | 'synthesis_complete'
  | 'outside_service_bridge';
export type DecisionType = 'offer' | 'confirmation' | 'clarification';
export type ActionCategory = 'room' | 'dining' | 'amenity' | 'facility';

export interface Keyword {
  word: string;
  type: KeywordType;
  highlighted: boolean;
}

export interface ReasoningBlock {
  type: ReasoningType;
  title: string;
  description: string;
  details: string[];
}

export interface Decision {
  type: DecisionType;
  text: string;
  importance: 'critical' | 'standard';
}

export interface Action {
  id: string;
  text: string;
  category: ActionCategory;
  status: 'pending' | 'executed';
}

export interface LogEntry {
  id: string;
  timestamp: number; // seconds into call
  guestMessage: {
    text: string;
    keywords: Keyword[];
  };
  reasoning: ReasoningBlock[];
  decision?: Decision;
  actions: Action[];
}

export interface CallState {
  status: 'idle' | 'in_progress' | 'ended';
  guestName: string;
  phoneNumber: string;
  startTime: number;
  entries: LogEntry[];
}

export const mockCallData: CallState = {
  status: 'in_progress',
  guestName: 'Mr. & Mrs. Tanaka',
  phoneNumber: '+1 (415) 555-0182',
  startTime: 0,
  entries: [
    {
      id: 'entry-1',
      timestamp: 2,
      guestMessage: {
        text: "Hello, I'm calling about my reservation this evening.",
        keywords: [
          { word: 'reservation', type: 'logistical', highlighted: true },
          { word: 'this evening', type: 'logistical', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'occasion_detected',
          title: 'CALL RECEIVED',
          description: 'Incoming call detected',
          details: ['Incoming phone number received', 'Initiating guest lookup protocol'],
        },
      ],
      actions: [
        {
          id: 'a1',
          text: 'Caller identification initiated',
          category: 'room',
          status: 'executed',
        },
      ],
    },
    {
      id: 'entry-2',
      timestamp: 8,
      guestMessage: {
        text: "Yes, that's right. It's our anniversary weekend.",
        keywords: [
          { word: 'anniversary', type: 'occasion', highlighted: true },
          { word: 'weekend', type: 'logistical', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'occasion_detected',
          title: 'OCCASION DETECTED',
          description: 'Guest mentioned anniversary - emotional anchor identified',
          details: ['Trigger: anniversary weekend', 'Classification: emotional milestone'],
        },
        {
          type: 'memory_recall',
          title: 'MEMORY RECALLED',
          description: 'Past stay matched to current context',
          details: [
            'September 2023: Engagement weekend',
            'Room: Corner suite with oak tree view',
            'Significance: First significant visit together',
          ],
        },
        {
          type: 'context_bridge',
          title: 'LOCAL CONTEXT CONNECTED',
          description: 'Staff and amenities aligned with occasion',
          details: [
            'Chef Marie on duty - known for quiet anniversary experiences',
            'Sancerre Loire Valley 2021 available - guest preferred wine',
            'Patio available for private, quiet seating',
          ],
        },
        {
          type: 'synthesis_complete',
          title: 'ANTICIPATORY OFFER READY',
          description: 'All synthesis points aligned for offer delivery',
          details: [
            'Recall: Previous engagement stay at property',
            'Bridge: Chef Marie + quiet setting + preferred wine',
            'Proposal: Off-the-bill surprise experience',
          ],
        },
      ],
      decision: {
        type: 'offer',
        text: "How wonderful—congratulations. You stayed with us for your engagement two years ago in the corner suite. I'll have that room reserved again. And Chef Marie does something quite special for anniversaries. Would you like that kept off the bill as a surprise?",
        importance: 'critical',
      },
      actions: [
        {
          id: 'a2',
          text: 'Caller identified: Mr. & Mrs. Tanaka',
          category: 'room',
          status: 'executed',
        },
        {
          id: 'a3',
          text: 'Corner suite requested (matching Sept 2023)',
          category: 'room',
          status: 'executed',
        },
        {
          id: 'a4',
          text: 'Anniversary occasion flagged',
          category: 'amenity',
          status: 'executed',
        },
        {
          id: 'a5',
          text: 'Chef Marie notified: Anniversary setup',
          category: 'dining',
          status: 'executed',
        },
        {
          id: 'a6',
          text: 'Off-bill surprise amenity prepared',
          category: 'amenity',
          status: 'executed',
        },
      ],
    },
    {
      id: 'entry-3',
      timestamp: 18,
      guestMessage: {
        text: "We'd love a quiet table at Madera around 7pm if possible.",
        keywords: [
          { word: 'quiet', type: 'constraint', highlighted: true },
          { word: 'Madera', type: 'preference', highlighted: true },
          { word: '7pm', type: 'logistical', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'preference_match',
          title: 'PREFERENCE PATTERN RECOGNIZED',
          description: 'Current request aligns with historical dining behavior',
          details: [
            'Historical preference: Quiet seating (all prior visits)',
            'Venue preference: Madera restaurant (previous stays)',
            'Time preference: Early-to-mid evening (7:00 PM typical)',
          ],
        },
        {
          type: 'context_bridge',
          title: 'AVAILABILITY CONFIRMED',
          description: 'Local context supports dining request',
          details: [
            'Madera patio has quiet corner table available at 7:00 PM',
            'Sancerre Loire Valley 2021 in stock and ready to chill',
            'Staff briefed on anniversary occasion',
          ],
        },
      ],
      decision: {
        type: 'confirmation',
        text: "Of course. I've reserved a corner table on the patio for 7pm with your preferred Sancerre chilled and ready.",
        importance: 'standard',
      },
      actions: [
        {
          id: 'a7',
          text: 'Madera patio · 7:00 PM reserved',
          category: 'dining',
          status: 'executed',
        },
        {
          id: 'a8',
          text: 'Table setup: quiet corner (guest preference)',
          category: 'dining',
          status: 'executed',
        },
        {
          id: 'a9',
          text: 'Sancerre Loire Valley 2021 chilled',
          category: 'dining',
          status: 'executed',
        },
        {
          id: 'a10',
          text: 'Madera staff notified: anniversary celebration',
          category: 'dining',
          status: 'executed',
        },
      ],
    },
    {
      id: 'entry-4',
      timestamp: 24,
      guestMessage: {
        text: "That sounds perfect. What time should we arrive at the hotel?",
        keywords: [
          { word: 'arrive', type: 'logistical', highlighted: true },
          { word: 'hotel', type: 'logistical', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'context_bridge',
          title: 'ARRIVAL TIME OPTIMIZED',
          description: 'Flight data and onsite preparation aligned',
          details: [
            'Flight UA241 ETA: 4:32 PM Pacific Time',
            'Check-in ready by 5:00 PM',
            'Dinner reservation: 7:00 PM',
            'Buffer: 2 hour window for arrival & refresh',
          ],
        },
      ],
      decision: {
        type: 'confirmation',
        text: "Your flight arrives at 4:32, so plan for a 5:00 check-in. That gives you time to rest before your 7pm dinner reservation.",
        importance: 'standard',
      },
      actions: [
        {
          id: 'a11',
          text: 'Check-in expedited · Ready by 5:00 PM',
          category: 'room',
          status: 'executed',
        },
        {
          id: 'a12',
          text: 'Room refreshed with extra duvet (guest preference)',
          category: 'room',
          status: 'executed',
        },
        {
          id: 'a13',
          text: 'Room temperature preset to 68°F',
          category: 'room',
          status: 'executed',
        },
      ],
    },
  ],
};

export const mockBriefingData = {
  guestName: 'Mr. & Mrs. Tanaka',
  roomType: 'Corner Suite with Oak Tree View',
  checkInTime: '5:00 PM',
  occasion: 'Anniversary Weekend',
  callDuration: '4:32',

  offerMade: {
    recall: 'Engagement weekend stay (Sept 2023) in corner suite',
    bridge: 'Chef Marie creates quiet anniversary surprises',
    proposal: 'Off-the-bill anniversary dinner experience',
  },

  preferencesIdentified: [
    'Quiet seating (dining)',
    'Sancerre wine preference',
    'Corner/private room location',
    'Room temperature ~68°F',
    'Extra duvet for comfort',
    'Early dinner preference',
  ],

  actionsConfirmed: [
    'Corner suite reserved (matching engagement stay)',
    'Chef Marie briefed on anniversary celebration',
    'Madera patio corner table · 7:00 PM',
    'Sancerre Loire Valley 2021 chilled & ready',
    'Off-bill surprise amenity prepared',
    'Staff briefed on special occasion',
    'Room preset (temperature, amenities, duvet)',
  ],
};
