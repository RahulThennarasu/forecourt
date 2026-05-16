import type { CallState } from './mockCallData';

export const mockCallDataPhilip: CallState = {
  status: 'in_progress',
  guestName: 'Philip Meyer',
  phoneNumber: '+1 (650) 555-0142',
  startTime: 0,
  entries: [
    {
      id: 'entry-1',
      timestamp: 2,
      guestMessage: {
        text: "Hi, I'm arriving at the property this afternoon for a brief stay before my meetings in Palo Alto.",
        keywords: [
          { word: 'arriving', type: 'logistical', highlighted: true },
          { word: 'this afternoon', type: 'logistical', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'occasion_detected',
          title: 'INTERNAL VIP IDENTIFIED',
          description: 'Philip Meyer, Regional VP & Managing Director',
          details: [
            'Corporate Executive Guest',
            'Deeply familiar with Sand Hill operations and luxury service expectations'
          ],
        },
      ],
      decision: {
        type: 'confirmation',
        text: "Welcome back, Mr. Meyer. We have your preferred Santa Cruz Mountain-View Suite pre-keyed and ready. Given your tight schedule before Palo Alto, I have bypassed the front desk entirely and arranged for your private check-in directly in-villa.",
        importance: 'standard',
      },
      actions: [
        {
          id: 'a1',
          text: 'VIP Internal Alert Triggered: Philip Meyer on property',
          category: 'room',
          status: 'executed',
        },
        {
          id: 'a2',
          text: 'Santa Cruz Mountain-View Suite prepared with private in-villa check-in',
          category: 'room',
          status: 'executed',
        },
      ],
    },
    {
      id: 'entry-2',
      timestamp: 8,
      guestMessage: {
        text: "Perfect. I'm planning to hit the road early tomorrow morning for a long ride—the weather looks incredible up on the ridge.",
        keywords: [
          { word: 'road early', type: 'preference', highlighted: true },
          { word: 'long ride', type: 'preference', highlighted: true },
          { word: 'weather looks incredible', type: 'logistical', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'preference_match',
          title: 'SIGNATURE PATTERN RECOGNIZED',
          description: 'Cycling is the guest’s primary executive wellness activity',
          details: [
            'Known to ride 200+ miles weekly; prefers 5:30 AM wheels-up',
            'Historical Preference: Requests high-altitude climbing routes (Kings Mountain / Skyline Blvd)',
            'Bike Profile: Specialized S-Works Tarmac SL8 stored on-site'
          ],
        },
        {
          type: 'context_bridge',
          title: 'LOCAL CYCLING CONDITIONS OPTIMAL',
          description: 'Perfect atmospheric conditions for Woodside/Skyline loop',
          details: [
            'No morning fog on the ridge; 58°F ambient dawn temperature',
            'Bici Coffee espresso bar pre-notified for early opening',
            'Lead local cycling guide Marco confirmed available for pacing'
          ],
        },
        {
          type: 'synthesis_complete',
          title: 'ANTICIPATORY LUXURY EXPERIENCE GENERATED',
          description: 'Synthesizing historical route profiles with real-time technical support',
          details: [
            'Recall: Prefers custom high-sodium electrolyte fuel packs',
            'Bridge: Mechanics + specialized route pacing guide + recovery window',
            'Proposal: 60-mile technical mountain loop with pre-staged logistics'
          ],
        },
      ],
      decision: {
        type: 'offer',
        text: "I see the ridge has clear visibility tomorrow morning. I’ve gone ahead and reserved Marco to pace you on the 60-mile Kings Mountain to Skyline loop starting at 5:30 AM. Our house mechanic is tuning your S-Works Tarmac tonight, and Bici Coffee will have your double-espresso ready at the staging area at 5:15 AM. Shall we have your custom high-sodium electrolyte packs pre-loaded into your bottles?",
        importance: 'critical',
      },
      actions: [
        {
          id: 'a3',
          text: 'Pacing Guide Marco reserved for Kings Mountain Loop · 5:30 AM',
          category: 'facility',
          status: 'executed',
        },
        {
          id: 'a4',
          text: 'On-site bike mechanics activated for full frame & drivetrain tune-up',
          category: 'facility',
          status: 'executed',
        },
        {
          id: 'a5',
          text: 'Bici Coffee scheduled for custom 5:15 AM espresso staging',
          category: 'amenity',
          status: 'executed',
        },
        {
          id: 'a6',
          text: 'Custom high-sodium electrolyte hydration packs pre-positioned',
          category: 'amenity',
          status: 'executed',
        },
      ],
    },
    {
      id: 'entry-3',
      timestamp: 15,
      guestMessage: {
        text: "That sounds stellar. One constraint though—I have a late board call regarding The Carlyle property that will run past 6 PM. Will dinner still work out at Madera?",
        keywords: [
          { word: 'board call', type: 'logistical', highlighted: true },
          { word: 'Carlyle property', type: 'logistical', highlighted: true },
          { word: 'run past 6 PM', type: 'constraint', highlighted: true },
          { word: 'Madera', type: 'preference', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'occasion_detected',
          title: 'EXECUTIVE TIMING CONFLICT',
          description: 'Cross-property corporate responsibilities disrupting personal schedule',
          details: [
            'Carlyle (NYC) alignment call overrunning past Pacific evening hours',
            'High-stress operational context requiring post-call decompression',
            'Standard Madera dining room will be at peak capacity'
          ],
        },
        {
          type: 'preference_match',
          title: 'DINING DECOMPRESSION CONFIGURATION',
          description: 'Prefers secluded, low-stimulus environments after corporate board calls',
          details: [
            'Historical Trend: Avoids high-traffic center tables post-meetings',
            'Prefers Chef Laurent’s custom tasting menu pairings without rigid seating times',
            'Requires absolute schedule fluidity'
          ],
        },
      ],
      decision: {
        type: 'confirmation',
        text: "We will easily absorb that delay, sir. I have transitioned your Madera dining window to an open, fluid hold. Chef Laurent has reserved the quiet alcove at the Chef’s Counter for you anytime after 7:30 PM. There is zero cancellation pressure; we will keep the kitchen active for you even if the Carlyle call runs late into the evening. Does that offer you enough breathing room?",
        importance: 'standard',
      },
      actions: [
        {
          id: 'a7',
          text: 'Madera Dining Reservation converted to infinite VIP open hold',
          category: 'dining',
          status: 'executed',
        },
        {
          id: 'a8',
          text: 'Secluded Madera Chef’s Counter alcove blocked for low-stimulus dining',
          category: 'dining',
          status: 'executed',
        },
        {
          id: 'a9',
          text: 'Chef Laurent briefed on late-night culinary flexibility and custom pairings',
          category: 'dining',
          status: 'executed',
        },
      ],
    },
    {
      id: 'entry-4',
      timestamp: 22,
      guestMessage: {
        text: "Fantastic. One last thing—I’m currently mentoring the Bay Area Youth Cycling Initiative. Could your team help coordinate a localized charity benefit event or tech-donor outreach while I'm on property?",
        keywords: [
          { word: 'Bay Area Youth Cycling', type: 'preference', highlighted: true },
          { word: 'charity benefit', type: 'logistical', highlighted: true },
          { word: 'tech-donor outreach', type: 'logistical', highlighted: true },
        ],
      },
      reasoning: [
        {
          type: 'occasion_detected',
          title: 'PHILANTHROPIC ALIGNMENT',
          description: 'Guest’s core charity initiative matching regional capabilities',
          details: [
            'Bay Area Youth Cycling Initiative requires local VC/Tech capital access',
            'Guest looking to leverage personal presence for corporate citizenship action',
            'Requires intersection of resort facilities and local Silicon Valley network'
          ],
        },
        {
          type: 'context_bridge',
          title: 'ASSET DEPLOYMENT FEASIBLE',
          description: 'Utilizing resort network and infrastructure for high-value execution',
          details: [
            'Rosewood Sand Hill tech board network is currently active on-property',
            'Director of Community Affairs has active outreach pipelines to Sand Hill Road VCs',
            'Vista Lawn / Executive Boardroom available for localized presentation window'
          ],
        },
      ],
      decision: {
        type: 'offer',
        text: "We would love to champion this. We will contact our Director of Community Affairs and reach out to three prominent Venture Capital managing partners—all cycling enthusiasts currently staying with us. We can book the Executive Boardroom for 3:00 PM tomorrow if you'd like to host an intimate donor briefing, and we can arrange a charity reception on the Vista Lawn for your next visit. Shall I confirm the boardroom setup?",
        importance: 'critical',
      },
      actions: [
        {
          id: 'a10',
          text: 'Director of Community Affairs to be engaged as core nonprofit liaison',
          category: 'facility',
          status: 'pending',
        },
        {
          id: 'a11',
          text: 'Outreach to be initiated to 3 on-property VC/Tech donors for charity mentorship briefing',
          category: 'amenity',
          status: 'pending',
        },
        {
          id: 'a12',
          text: 'Executive Boardroom can be booked for 3:00 PM pitch & donor presentation',
          category: 'facility',
          status: 'pending',
        },
      ],
    },
  ],
};

export const mockBriefingDataPhilip = {
  guestName: 'Philip Meyer',
  roomType: 'Santa Cruz Mountain-View Suite (Presidents Wing)',
  checkInTime: 'Expedited In-Villa Check-In (Early Afternoon)',
  title: 'Regional Vice President & Managing Director',
  callDuration: '5:42',

  offersMade: [
    {
      recall: 'High-altitude alpine climbing preference (Kings Mountain/Skyline Loop)',
      bridge: 'Clear visibility on the ridge + on-site mechanics + pacing guide Marco + Bici Coffee custom early opening',
      proposal: '5:30 AM wheels-up package with pre-loaded high-sodium electrolyte packs and tuned on-site S-Works frame.',
    },
    {
      recall: 'High-stress corporate overruns (The Carlyle Board Call) require low-stimulus decompression',
      bridge: 'Madera peak-hour avoidance + direct access to Executive Chef Laurent',
      proposal: 'Infinite open dinner hold at a secluded Chef’s Counter alcove with complete relief from cancellation window friction.',
    },
    {
      recall: 'Active mentorship of the Bay Area Youth Cycling Initiative',
      bridge: 'On-property Venture Capital tech network + internal Community Affairs outreach infrastructure',
      proposal: 'Immediate activation of 3 targeted VC leads alongside a 3:00 PM Executive Boardroom reservation for localized donor pitch.',
    },
    {
      recall: 'Spa capacity constraints vs. extreme muscle fatigue from 60-mile ride',
      bridge: 'Third-party clinical athletic relationships in Palo Alto',
      proposal: 'In-suite deployment of contracted Normatec dynamic air-compression systems by 10:00 AM via outside vendor dispatch.',
    },
  ],

  preferencesIdentified: [
    'Elite endurance cycling (Ultra-distance climbing, 200+ mile training baseline)',
    'Pre-dawn cycling deployment (5:30 AM wheels-up requirements)',
    'Advanced hyper-customized endurance nutrition (High-sodium hydration profile)',
    'Low-stimulus, secluded fine-dining configurations following complex corporate board meetings',
    'Direct engagement with artisan culinary leaders (Chef’s Counter preference over main dining layout)',
    'High-leverage philanthropic alignment (Bridging personal luxury stays with local venture/tech donor networks)',
    'High autonomy execution (Bypassing public front desks via private in-villa check-in ecosystems)',
  ],

  actionsConfirmed: [
    'Santa Cruz Mountain-View Suite locked with VIP Executive Designation',
    'Front Desk bypassed; automated in-villa private check-in workflow deployed',
    'Pacing Guide Marco reserved for technical alpine loop instruction at 5:30 AM',
    'On-site bike mechanics activated for multi-point drivetrain calibration and frame inspection',
    'Bici Coffee custom opening sequence executed for 5:15 AM espresso prep',
    'Pre-staged high-sodium electrolyte packs allocated to culinary team for bottle deployment',
    'Madera traditional dinner reservation converted to open-ended infinite hold status',
    'Secluded Chef’s Counter alcove isolated for low-stimulus decompression window',
    'Director of Community Affairs deployed as active institutional nonprofit liaison',
    '3 Targeted Venture Capital leads extracted from staying database and contacted for philanthropy outreach',
    'Executive Boardroom prepared and reserved for 3:00 PM donor briefing deck presentation',
    'External Contract finalized with Specialized Sports Therapy Labs for mobile asset routing',
    'In-suite deployment of Normatec Dynamic Compression boots confirmed for 10:00 AM delivery',
    'Custom Welcome Portfolio delivered to suite featuring updated regional trail maps and local donor briefing profiles',
  ],
};
