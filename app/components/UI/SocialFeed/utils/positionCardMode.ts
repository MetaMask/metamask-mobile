import type { SocialV1FeedItem } from '../types';

export type PositionCardMode =
  | 'open'
  | 'closed'
  | 'liveCompact'
  | 'closedCompact';

/**
 * Picks the Figma layout for a position card. A written comment keeps the full
 * card; without one the card drops to its compact variant, which keeps the
 * same open or closed state.
 */
export const getPositionCardMode = (
  item: SocialV1FeedItem,
): PositionCardMode => {
  const isClosed =
    item.variant === 'perpsClosed' || item.variant === 'spotClosed';

  if (item.comment) {
    return isClosed ? 'closed' : 'open';
  }

  return isClosed ? 'closedCompact' : 'liveCompact';
};
