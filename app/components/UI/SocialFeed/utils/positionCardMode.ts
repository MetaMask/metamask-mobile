import type { SocialV1FeedItem } from '../types';

export type PositionCardMode =
  | 'open'
  | 'closed'
  | 'openCompact'
  | 'closedCompact';

export interface PositionCardModeOptions {
  /**
   * Pick the commented layout even without a caption. Composer previews pass
   * this so a position looks the same before and after it is posted with a
   * comment. The feed never passes it.
   */
  expanded?: boolean;
}

/**
 * Which of the four position card layouts a feed item renders. A comment
 * selects the detailed layouts; a post without one reads as a compact card,
 * unless the caller asks for the expanded layout. Only the closed variants are
 * closed, so composer spot shares count as open.
 */
export const getPositionCardMode = (
  item: SocialV1FeedItem,
  { expanded = false }: PositionCardModeOptions = {},
): PositionCardMode => {
  const isClosed =
    item.variant === 'perpsClosed' || item.variant === 'spotClosed';
  if (expanded || item.comment || item.commentGifUrl) {
    return isClosed ? 'closed' : 'open';
  }
  return isClosed ? 'closedCompact' : 'openCompact';
};
