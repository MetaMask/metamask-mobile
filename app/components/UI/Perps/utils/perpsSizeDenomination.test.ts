import {
  resolveShownPerpsSizeDenomination,
  toPerpsSizeUnitAnalyticsValue,
} from './perpsSizeDenomination';

describe('toPerpsSizeUnitAnalyticsValue', () => {
  it('maps USD to usd', () => {
    expect(toPerpsSizeUnitAnalyticsValue('usd')).toBe('usd');
  });

  it('maps the asset denomination to coin', () => {
    expect(toPerpsSizeUnitAnalyticsValue('asset')).toBe('coin');
  });
});

describe('resolveShownPerpsSizeDenomination', () => {
  it('keeps a saved coin unit in USD until the price can project it', () => {
    expect(
      resolveShownPerpsSizeDenomination({
        saved: 'asset',
        price: 0,
        holdUsdEdit: false,
      }),
    ).toBe('usd');
  });

  it('shows coin once the price is positive and no USD edit is open', () => {
    expect(
      resolveShownPerpsSizeDenomination({
        saved: 'asset',
        price: 25,
        holdUsdEdit: false,
      }),
    ).toBe('asset');
  });

  it('keeps an open pre-price USD edit in USD after the price arrives', () => {
    expect(
      resolveShownPerpsSizeDenomination({
        saved: 'asset',
        price: 25,
        holdUsdEdit: true,
      }),
    ).toBe('usd');
  });
});
