export interface RelativeTimeOptions {
  nowLabel?: string;
}

export interface HighlightedSegment {
  text: string;
  highlighted: boolean;
}

export const formatRelativeTime = (
  dateString: string,
  options: RelativeTimeOptions = {},
): string => {
  const { nowLabel = 'just now' } = options;
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return nowLabel;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const buildHighlightedSegments = (
  text: string,
  highlightTerms: string[],
): HighlightedSegment[] => {
  if (highlightTerms.length === 0) {
    return [{ text, highlighted: false }];
  }

  const escapedTerms = highlightTerms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  const parts: HighlightedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        highlighted: false,
      });
    }
    parts.push({ text: match[0], highlighted: true });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return parts.length > 0 ? parts : [{ text, highlighted: false }];
};
