import { buildCopyTradeSubmittedProperties } from './buildCopyTradeSubmittedProperties';
import { SocialEvent } from './socialEvents';
const base = {
  interaction_type: SocialEvent.Interaction.COPY_TRADE_SUBMITTED,
  screen_name: SocialEvent.Screen.TRENDING,
  trade_type: SocialEvent.Trade.PERPS,
};
describe('buildCopyTradeSubmittedProperties', () => {
  it('records a trending perps copy with its fee', () => {
    expect(
      buildCopyTradeSubmittedProperties({
        source: 'social_trending',
        asset: 'BTC',
        direction: 'long',
        amountUsd: 50,
        metamaskFeeUsd: 0.05,
        orderId: '12345',
      }),
    ).toEqual({
      ...base,
      source: 'social_trending',
      asset: 'BTC',
      direction: SocialEvent.Direction.LONG,
      amount_usd: 50,
      metamask_fee: 0.05,
      order_id: '12345',
    });
  });
  it('keeps a copy that has no known source', () => {
    expect(
      buildCopyTradeSubmittedProperties({
        source: 'wallet-address',
        asset: 'ETH',
        direction: 'short',
      }),
    ).toEqual({
      ...base,
      asset: 'ETH',
      direction: SocialEvent.Direction.SHORT,
    });
  });

  it.each([
    ['trader_feed', SocialEvent.Screen.TRADER_FEED],
    ['leaderboard', SocialEvent.Screen.LEADERBOARD],
    ['social_following', SocialEvent.Screen.FOLLOWING],
    ['social_live_trades', SocialEvent.Screen.LIVE_TRADES],
    ['trader_profile', SocialEvent.Screen.TRADER_PROFILE],
  ] as const)('attributes a %s copy to that screen', (source, screenName) => {
    expect(
      buildCopyTradeSubmittedProperties({
        source,
        asset: 'ETH',
        direction: 'long',
      }),
    ).toEqual({
      ...base,
      screen_name: screenName,
      source,
      asset: 'ETH',
      direction: SocialEvent.Direction.LONG,
    });
  });
});
