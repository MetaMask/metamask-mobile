import { isQuickBuyCopyTrade } from './isQuickBuyCopyTrade';

describe('isQuickBuyCopyTrade', () => {
  it.each([
    [{ copyTradeOrigin: { kind: 'comment', id: 'c1' } }, true],
    [{ isCopyTrade: true }, true],
    [{ isCopyTrade: false }, false],
    [{}, false],
  ] as const)('returns %s', (input, expected) => {
    expect(isQuickBuyCopyTrade(input)).toBe(expected);
  });
});
