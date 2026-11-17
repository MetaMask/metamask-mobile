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
      }),
    ).toEqual({
      ...base,
      source: 'social_trending',
      asset: 'BTC',
      direction: SocialEvent.Direction.LONG,
      amount_usd: 50,
      metamask_fee: 0.05,
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
});
