import { CallOrchestrationView } from './call/CallOrchestrationView';

// LiveCallView is the live wrapper: CallOrchestrationView consumes the
// WebSocket at /ws (call_started, guest_turn, agent_turn, leak_guard,
// call_ended) and fetches /calls for the recent-calls list. No mock data,
// no setTimeout simulation — the timeline reflects what's actually
// happening on the line right now.
export function LiveCallView() {
  return <CallOrchestrationView />;
}
