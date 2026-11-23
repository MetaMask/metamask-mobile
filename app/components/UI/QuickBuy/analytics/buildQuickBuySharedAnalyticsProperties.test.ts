import { buildQuickBuySharedAnalyticsProperties } from './buildQuickBuySharedAnalyticsProperties';
import { QuickBuyEventProperties } from './quickBuyEvents';

type SharedInput = Parameters<typeof buildQuickBuySharedAnalyticsProperties>[0];
interface SharedExpected {
  source: string;
  isCopyTrade: boolean;
  postId?: string;
}

describe('buildQuickBuySharedAnalyticsProperties', () => {
  it.each<[SharedInput, SharedExpected]>([
    [
      { source: 'social_trending' as const, isCopyTrade: true },
      { source: 'social_trending', isCopyTrade: true },
    ],
    [
      { source: 'asset_details' as const },
      { source: 'asset_details', isCopyTrade: false },
    ],
    [
      {
        source: 'trader_feed' as const,
        copyTradeOrigin: { commentId: 'comment-1' },
      },
      {
        source: 'trader_feed',
        isCopyTrade: true,
        postId: 'comment-1',
      },
    ],
  ])(
    'sets is_copy_trade and the source post from the sheet',
    (input, expected) => {
      expect(buildQuickBuySharedAnalyticsProperties(input)).toEqual({
        [QuickBuyEventProperties.SOURCE]: expected.source,
        [QuickBuyEventProperties.IS_COPY_TRADE]: expected.isCopyTrade,
        ...(expected.postId
          ? { [QuickBuyEventProperties.POST_ID]: expected.postId }
          : {}),
      });
    },
  );

  it('adds the author trader id when the copy origin has one', () => {
    expect(
      buildQuickBuySharedAnalyticsProperties({
        source: 'social_trending',
        copyTradeOrigin: { commentId: 'comment-1', authorId: 'trader-1' },
      }),
    ).toEqual({
      [QuickBuyEventProperties.SOURCE]: 'social_trending',
      [QuickBuyEventProperties.IS_COPY_TRADE]: true,
      [QuickBuyEventProperties.POST_ID]: 'comment-1',
      [QuickBuyEventProperties.AUTHOR_TRADER_ID]: 'trader-1',
    });
  });
});
