import { RequestsView } from './call/RequestsView';

export function RequestsPage() {
  return (
    <div className="h-full overflow-hidden flex flex-col" style={{ background: '#FFFFFF' }}>
      <div className="flex-shrink-0 px-10 py-6" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <p
          style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: '1.75rem',
            fontWeight: 300,
            color: '#000000',
            lineHeight: 1,
          }}
        >
          Requests
        </p>
        <p style={{ fontFamily: 'PP Neue Montreal, sans-serif', fontSize: '0.875rem', color: '#000000', opacity: 0.6, marginTop: 8 }}>
          Outside services and partner outreach, ready for quick calling.
        </p>
      </div>

      <RequestsView />
    </div>
  );
}

