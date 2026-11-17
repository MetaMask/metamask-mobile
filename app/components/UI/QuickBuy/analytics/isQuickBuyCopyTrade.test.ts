import { isQuickBuyCopyTrade } from './isQuickBuyCopyTrade';

describe('isQuickBuyCopyTrade', () => {
  it.each([
    [
      {
        copyTradeOrigin: { kind: 'comment', id: 'c1' },
        source: 'asset_details',
      },
      true,
    ],
    [{ isCopyTrade: true, source: 'trader_feed' }, true],
    [{ source: 'trader_feed', traderAddress: '0xTRADER' }, true],
    [{ source: 'asset_details', traderAddress: '0xTRADER' }, false],
    [{ source: 'social_trending' }, false],
  ] as const)('returns %s', (input, expected) => {
    expect(isQuickBuyCopyTrade(input)).toBe(expected);
  });
});
