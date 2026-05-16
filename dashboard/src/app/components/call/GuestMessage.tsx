import { motion } from 'motion/react';
import { Keyword } from '@/data/mockCallData';

const KEYWORD_HIGHLIGHT = 'rgba(255, 225, 120, 0.7)'; // warm yellow highlight

interface Props {
  text: string;
  keywords: Keyword[];
  timestamp: number;
  showHeader?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function renderTextWithHighlights(text: string, keywords: Keyword[]) {
  if (!keywords.length) return text;

  const sortedKeywords = [...keywords].sort((a, b) => text.indexOf(a.word) - text.indexOf(b.word));

  const parts: Array<{ text: string; keyword?: Keyword }> = [];
  let lastIndex = 0;

  sortedKeywords.forEach((kw) => {
    const index = text.indexOf(kw.word, lastIndex);
    if (index > -1) {
      if (index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, index) });
      }
      parts.push({ text: kw.word, keyword: kw });
      lastIndex = index + kw.word.length;
    }
  });

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
}

export function GuestMessage({ text, keywords, timestamp, showHeader = true }: Props) {
  const parts = renderTextWithHighlights(text, keywords);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-2"
    >
      {showHeader ? (
        <div className="flex items-center justify-between">
          <p
            className="text-xs font-medium tracking-wide uppercase"
            style={{
              color: '#000000',
              fontFamily: 'PP Neue Montreal, sans-serif',
              fontSize: '0.5625rem',
              letterSpacing: '0.12em',
            }}
          >
            Guest
          </p>
          <p
            className="text-xs"
            style={{
              color: '#000000',
              fontFamily: 'PP Neue Montreal, sans-serif',
              fontSize: '0.75rem',
            }}
          >
            {formatTime(timestamp)}
          </p>
        </div>
      ) : null}

      <p
        className="leading-relaxed"
        style={{
          color: '#000000',
          fontFamily: 'PP Neue Montreal, sans-serif',
          fontSize: '1.0625rem',
          lineHeight: '1.65',
        }}
      >
        {parts.map((part, i) =>
          part.keyword ? (
            <span
              key={i}
              className="font-semibold"
              style={{
                color: '#000000',
                background: KEYWORD_HIGHLIGHT,
                borderRadius: 6,
                padding: '1px 6px',
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </p>
    </motion.div>
  );
}
