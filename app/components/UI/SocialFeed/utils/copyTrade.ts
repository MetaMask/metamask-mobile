import type { SocialV1FeedItem } from '../types';

/**
 * Whether a reader can still copy this post's trade. Only open positions can:
 * a closed one no longer exists to mirror. Composer spot shares carry their own
 * flag, because the composer can share a position that has since closed.
 */
export const isCopyTradeable = (item: SocialV1FeedItem): boolean => {
  if (item.variant === 'spotShare') {
    return Boolean(item.showCopyTrade);
  }
  if (item.variant === 'perpsOpen') {
    return item.showCopyTrade !== false;
  }
  return item.variant === 'spotOpen';
};
