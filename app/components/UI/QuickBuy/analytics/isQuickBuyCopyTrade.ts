import type { QuickBuySheetSource } from './quickBuyEvents';

/**
 * Sheet sources that name another trader. A trade from one of these, with a
 * trader address, is a copy even when the post has no comment id.
 */
const TRADER_COPY_SOURCES = new Set<QuickBuySheetSource>([
  'profile_position',
  'leaderboard',
  'trader_feed',
  'social_trending',
  'social_following',
  'social_live_trades',
]);

export const isQuickBuyCopyTrade = ({
  copyTradeOrigin,
  isCopyTrade,
  source,
  traderAddress,
}: {
  copyTradeOrigin?: unknown;
  isCopyTrade?: boolean;
  source?: QuickBuySheetSource;
  traderAddress?: string;
}): boolean =>
  Boolean(copyTradeOrigin) ||
  isCopyTrade === true ||
  (Boolean(traderAddress) && source != null && TRADER_COPY_SOURCES.has(source));
