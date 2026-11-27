import { buildSpotCopyTradeSubmittedProperties } from './buildSpotCopyTradeSubmittedProperties';

describe('buildSpotCopyTradeSubmittedProperties', () => {
  it('returns null when the Quick Buy trade is not a copy trade', () => {
    expect(
      buildSpotCopyTradeSubmittedProperties({
        is_copy_trade: false,
        trade_type: 'buy',
        caip19: 'eip155:1/erc20:0xabc',
      }),
    ).toBeNull();
  });

  it('maps a copy-trade buy to a spot copy trade with the side kept separate', () => {
    expect(
      buildSpotCopyTradeSubmittedProperties({
        is_copy_trade: true,
        trade_type: 'buy',
        caip19: 'eip155:1/erc20:0xabc',
        source: 'asset_details',
        post_id: 'comment-1',
        author_trader_id: 'trader-1',
        amount_usd: 25,
        metamask_fee_usd: 0.25,
        has_social_profile: true,
      }),
    ).toEqual({
      trade_type: 'spot',
      side: 'buy',
      caip19: 'eip155:1/erc20:0xabc',
      source: 'asset_details',
      post_id: 'comment-1',
      author_trader_id: 'trader-1',
      amount_usd: 25,
      metamask_fee: 0.25,
    });
  });

  it('omits optional fields that the trade does not have', () => {
    const properties = buildSpotCopyTradeSubmittedProperties({
      is_copy_trade: true,
      trade_type: 'sell',
    });

    expect(properties).toEqual({ trade_type: 'spot', side: 'sell' });
  });
});
