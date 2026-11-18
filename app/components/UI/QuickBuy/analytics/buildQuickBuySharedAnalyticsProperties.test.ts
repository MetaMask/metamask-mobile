import { buildQuickBuySharedAnalyticsProperties } from './buildQuickBuySharedAnalyticsProperties';
import { QuickBuyEventProperties } from './quickBuyEvents';

describe('buildQuickBuySharedAnalyticsProperties', () => {
  it.each([
    [
      { source: 'social_trending' as const, isCopyTrade: true },
      'social_trending',
      true,
    ],
    [{ source: 'asset_details' as const }, 'asset_details', false],
    [
      {
        source: 'trader_feed' as const,
        copyTradeOrigin: { commentId: 'comment-1' },
      },
      'trader_feed',
      true,
    ],
  ])('sets is_copy_trade from the sheet', (input, source, isCopyTrade) => {
    expect(buildQuickBuySharedAnalyticsProperties(input)).toEqual({
      [QuickBuyEventProperties.SOURCE]: source,
      [QuickBuyEventProperties.IS_COPY_TRADE]: isCopyTrade,
    });
  });
});
