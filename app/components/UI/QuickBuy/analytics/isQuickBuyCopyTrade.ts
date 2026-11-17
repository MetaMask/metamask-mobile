import type { QuickBuySheetSource } from './quickBuyEvents';

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
