import { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LogEntry as LogEntryType } from '@/data/mockCallData';
import { GuestMessage } from './GuestMessage';

interface Props {
  entries: LogEntryType[];
}

export function OrchestrationLog({ entries }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());

  // Auto-scroll to bottom as new entries appear
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(t);
  }, [entries.length]);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function labelForType(type?: string) {
    if (!type) return 'step';
    const lower = type.toLowerCase();
    if (lower === 'tool') return 'tool';
    if (lower === 'llm') return 'llm';
    return lower;
  }

  function Step({
    label,
    title,
    meta,
    children,
    tone = 'neutral',
    variant = 'sub',
    align = 'left',
  }: {
    label: string;
    title?: string;
    meta?: string;
    children?: React.ReactNode;
    tone?: 'neutral' | 'accent' | 'muted';
    variant?: 'main' | 'sub';
    align?: 'left' | 'right';
  }) {
    const labelBg = '#FFFFFF';
    const labelFg = '#000000';
    const isMain = variant === 'main';
    const isRight = align === 'right';

    if (!isMain) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-start justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: labelBg,
                  color: labelFg,
                  fontFamily: 'PP Neue Montreal, sans-serif',
                  fontSize: '9px',
                  border: '1px solid #E5E5E5',
                  textTransform: 'none',
                }}
              >
                {label}
              </span>
              {title ? (
                <p
                  className="truncate"
                  style={{
                    color: '#000000',
                    fontFamily: 'PP Neue Montreal, sans-serif',
                    fontSize: '0.875rem',
                    lineHeight: '1.35',
                    textTransform: 'none',
                  }}
                >
                  {title.toLowerCase()}
                </p>
              ) : null}
            </div>
            {children ? <div className="mt-1">{children}</div> : null}
          </div>

          {meta ? (
            <p
              className="flex-shrink-0"
              style={{
                color: '#000000',
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.6875rem',
                textTransform: 'none',
              }}
            >
              {meta}
            </p>
          ) : null}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative"
      >
        <div
          className="rounded-2xl border"
          style={{
            borderColor: '#E5E5E5',
            background: tone === 'accent' ? '#0a3622' : '#FFFFFF',
            boxShadow: '0 1px 0 rgba(17, 24, 39, 0.03)',
            maxWidth: 860,
            marginLeft: isRight ? 'auto' : 0,
            marginRight: isRight ? 0 : 'auto',
          }}
        >
          <div className={isMain ? 'px-7 py-6' : 'px-4 py-3'}>
            <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: labelBg,
                  color: labelFg,
                  fontFamily: 'PP Neue Montreal, sans-serif',
                  fontSize: isMain ? '10px' : '9px',
                  border: '1px solid #E5E5E5',
                  textTransform: 'none',
                }}
              >
                {label}
              </span>
              {title ? (
                <p
                  className="truncate"
                  style={{
                    color: tone === 'accent' ? '#FFFFFF' : '#000000',
                    fontFamily: 'PP Neue Montreal, sans-serif',
                    fontSize: isMain ? '1.25rem' : '1rem',
                    lineHeight: '1.3',
                    textTransform: 'none',
                  }}
                >
                  {title.toLowerCase()}
                </p>
              ) : null}
            </div>
            {meta ? (
              <p
                className="flex-shrink-0"
                style={{
                  color: tone === 'accent' ? '#FFFFFF' : '#000000',
                  fontFamily: 'PP Neue Montreal, sans-serif',
                  fontSize: isMain ? '0.75rem' : '0.6875rem',
                  textTransform: 'none',
                }}
              >
                {meta}
              </p>
            ) : null}
          </div>

          {children ? <div className="mt-2">{children}</div> : null}
          </div>
        </div>
      </motion.div>
    );
  }

  function SubSteps({
    entryId,
    reasoning,
    actions,
  }: {
    entryId: string;
    reasoning: LogEntryType['reasoning'];
    actions: LogEntryType['actions'];
  }) {
    const all = useMemo(
      () => [
        ...reasoning.map((r) => ({
          kind: 'reasoning' as const,
          label: labelForType(r.type),
          title: r.title,
          text: r.text,
          meta: r.duration ? `${r.duration.toFixed(3)}s` : undefined,
        })),
        ...actions.map((a) => ({
          kind: 'action' as const,
          label: labelForType(a.type),
          title: a.title || 'action',
          text: a.text,
          meta: a.duration ? `${a.duration.toFixed(3)}s` : undefined,
        })),
      ],
      [actions, reasoning],
    );

    const expanded = expandedEntryIds.has(entryId);
    const limit = 4;
    const shown = expanded ? all : all.slice(0, limit);
    const hiddenCount = Math.max(0, all.length - shown.length);

    if (all.length === 0) return null;

    return (
      <div className="ml-10">
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: '#FFFFFF',
            border: '1px solid #F0F0F0',
          }}
        >
          <div className="space-y-2">
            {shown.map((s, idx) => (
              <div key={`${entryId}-${idx}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: s.label === 'tool' ? '#F3E5D3' : '#FFFFFF',
                        color: '#000000',
                        fontFamily: 'PP Neue Montreal, sans-serif',
                        fontSize: '9px',
                        border: s.label === 'tool' ? '1px solid #E6C9A8' : '1px solid #E5E5E5',
                        textTransform: 'none',
                      }}
                    >
                      {s.label}
                    </span>
                    <p
                      className="truncate"
                      style={{
                        color: '#000000',
                        fontFamily: 'PP Neue Montreal, sans-serif',
                        fontSize: '0.8125rem',
                        lineHeight: '1.35',
                        textTransform: 'none',
                      }}
                    >
                      {(s.title || '').toLowerCase()}
                    </p>
                  </div>
                  <p
                    style={{
                      color: '#000000',
                      fontFamily: 'PP Neue Montreal, sans-serif',
                      fontSize: '0.8125rem',
                      lineHeight: '1.45',
                      marginTop: 4,
                    }}
                  >
                    {s.kind === 'action' ? (
                      <span
                        style={{
                          background: 'rgba(155, 207, 239, 0.55)',
                          borderRadius: 6,
                          padding: '2px 6px',
                          boxDecorationBreak: 'clone',
                          WebkitBoxDecorationBreak: 'clone',
                        }}
                      >
                        {s.text}
                      </span>
                    ) : s.label === 'tool' ? (
                      <span
                        style={{
                          background: 'rgba(243, 229, 211, 0.85)',
                          borderRadius: 6,
                          padding: '2px 6px',
                          boxDecorationBreak: 'clone',
                          WebkitBoxDecorationBreak: 'clone',
                        }}
                      >
                        {s.text}
                      </span>
                    ) : (
                      s.text
                    )}
                  </p>
                </div>
                {s.meta ? (
                  <p
                    className="flex-shrink-0"
                    style={{
                      color: '#000000',
                      fontFamily: 'PP Neue Montreal, sans-serif',
                      fontSize: '0.6875rem',
                      textTransform: 'none',
                      opacity: 0.7,
                    }}
                  >
                    {s.meta}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() =>
                setExpandedEntryIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(entryId)) next.delete(entryId);
                  else next.add(entryId);
                  return next;
                })
              }
              className="mt-3 text-left"
              style={{
                color: '#000000',
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.75rem',
                opacity: 0.75,
              }}
            >
              show {hiddenCount} more
            </button>
          ) : all.length > limit ? (
            <button
              type="button"
              onClick={() =>
                setExpandedEntryIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(entryId)) next.delete(entryId);
                  else next.add(entryId);
                  return next;
                })
              }
              className="mt-3 text-left"
              style={{
                color: '#000000',
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.75rem',
                opacity: 0.75,
              }}
            >
              show less
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden" style={{ background: '#FFFFFF' }}>
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-10 py-10"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E5E5 transparent' }}
      >
        {entries.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20">
            <p
              style={{
                color: '#000000',
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.875rem',
                textAlign: 'center',
              }}
            >
              Connecting…
            </p>
          </motion.div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-3">
                <Step label="guest" meta={formatTime(entry.timestamp)} variant="main" align="left">
                  <GuestMessage
                    text={entry.guestMessage.text}
                    keywords={entry.guestMessage.keywords}
                    timestamp={entry.timestamp}
                    showHeader={false}
                  />
                </Step>

                <SubSteps entryId={entry.id} reasoning={entry.reasoning} actions={entry.actions} />

                {entry.decision?.text ? (
                  <Step
                    label={labelForType(entry.decision.type)}
                    title={entry.decision.title || 'Response'}
                    meta={
                      // Prefer the agent-specific timestamp from the live
                      // socket (when the agent's audio is ready). Falls back
                      // to mock's `duration`, then to the guest timestamp.
                      typeof (entry.decision as { timestamp?: number }).timestamp === 'number'
                        ? formatTime((entry.decision as { timestamp: number }).timestamp)
                        : entry.decision.duration
                          ? `${entry.decision.duration.toFixed(3)}s`
                          : formatTime(entry.timestamp)
                    }
                    tone="accent"
                    variant="main"
                    align="right"
                  >
                    <p
                      style={{
                        color: '#FFFFFF',
                        fontFamily: 'PP Neue Montreal, sans-serif',
                        fontSize: '0.9375rem',
                        lineHeight: '1.65',
                      }}
                    >
                      {entry.decision.text}
                    </p>
                  </Step>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
