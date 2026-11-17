import { isQuickBuyCopyTrade } from './isQuickBuyCopyTrade';

describe('isQuickBuyCopyTrade', () => {
  it('is true for a copy-trade origin', () => {
    expect(
      isQuickBuyCopyTrade({
        copyTradeOrigin: { kind: 'comment', id: 'c1' },
        source: 'asset_details',
      }),
    ).toBe(true);
  });

  it('is true when the sheet was opened from Copy trade', () => {
    expect(
      isQuickBuyCopyTrade({
        isCopyTrade: true,
        source: 'trader_feed',
      }),
    ).toBe(true);
  });

  it('is true for a trader source that names a trader', () => {
    expect(
      isQuickBuyCopyTrade({
        source: 'trader_feed',
        traderAddress: '0xTRADER',
      }),
    ).toBe(true);
  });

  it('is false for asset details even with a trader address', () => {
    expect(
      isQuickBuyCopyTrade({
        source: 'asset_details',
        traderAddress: '0xTRADER',
      }),
    ).toBe(false);
  });

  it('is false for a trader source with no trader address', () => {
    expect(isQuickBuyCopyTrade({ source: 'social_trending' })).toBe(false);
  });
});
