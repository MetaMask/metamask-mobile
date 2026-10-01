import type { SocialV1FeedItem } from '../types';

/**
 * Whether a reader can still copy this post's trade. Only open positions can:
 * a closed one no longer exists to mirror. Composer spot shares carry their own
 * flag, because the composer can share a position that has since closed.
 *
 * Shared by the card, which decides whether to offer Copy trade, and the post
 * shell, which decides whether a copies count means anything.
 */
export const isCopyTradeable = (item: SocialV1FeedItem): boolean => {
  if (item.variant === 'spotShare') {
    return Boolean(item.showCopyTrade);
  }
  return item.variant === 'perpsOpen' || item.variant === 'spotOpen';
};

/**
 * Whether to render the Copy trade CTA on a feed card. Standalone cards (no
 * handler) still show the button for open positions. When a parent wires
 * `onCopyTrade`, only spot variants are actionable until perps copy trade is
 * handled in the feed shell (#37115).
 */
export const shouldShowCopyTradeCta = (
  item: SocialV1FeedItem,
  hasCopyTradeHandler: boolean,
): boolean => {
  if (!isCopyTradeable(item)) {
    return false;
  }
  if (!hasCopyTradeHandler) {
    return true;
  }
  return item.variant !== 'perpsOpen';
};
