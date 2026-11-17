import { buildQuickBuySharedAnalyticsProperties } from './buildQuickBuySharedAnalyticsProperties';
import { QuickBuyEventProperties } from './quickBuyEvents';

describe('buildQuickBuySharedAnalyticsProperties', () => {
  it('marks a trending copy on every shared event', () => {
    expect(
      buildQuickBuySharedAnalyticsProperties({
        source: 'social_trending',
        isCopyTrade: true,
      }),
    ).toEqual({
      [QuickBuyEventProperties.SOURCE]: 'social_trending',
      [QuickBuyEventProperties.IS_COPY_TRADE]: true,
    });
  });

  it('leaves a regular token buy unmarked', () => {
    expect(
      buildQuickBuySharedAnalyticsProperties({ source: 'asset_details' }),
    ).toEqual({
      [QuickBuyEventProperties.SOURCE]: 'asset_details',
      [QuickBuyEventProperties.IS_COPY_TRADE]: false,
    });
  });
});
