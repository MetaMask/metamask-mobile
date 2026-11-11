import {
  LOW_LIQUIDITY_TO_MARKET_CAP_RATIO,
  getLiquidityToMarketCapRatio,
  isLowLiquidityToMarketCapRatio,
} from './liquidityToMarketCap';

describe('getLiquidityToMarketCapRatio', () => {
  it('divides liquidity by market cap', () => {
    expect(getLiquidityToMarketCapRatio(560_000, 12_400_000)).toBeCloseTo(
      0.0452,
      4,
    );
  });

  it('returns zero for a token with no liquidity', () => {
    expect(getLiquidityToMarketCapRatio(0, 12_400_000)).toBe(0);
  });

  it.each([
    ['liquidity is null', null, 12_400_000],
    ['liquidity is undefined', undefined, 12_400_000],
    ['market cap is null', 560_000, null],
    ['market cap is undefined', 560_000, undefined],
  ])('returns null when %s', (_case, liquidity, marketCap) => {
    expect(getLiquidityToMarketCapRatio(liquidity, marketCap)).toBeNull();
  });

  it.each([
    ['market cap is zero', 560_000, 0],
    ['market cap is negative', 560_000, -12_400_000],
    ['liquidity is negative', -560_000, 12_400_000],
  ])('returns null when %s', (_case, liquidity, marketCap) => {
    expect(getLiquidityToMarketCapRatio(liquidity, marketCap)).toBeNull();
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('returns null when liquidity is %s', (_case, liquidity) => {
    expect(getLiquidityToMarketCapRatio(liquidity, 12_400_000)).toBeNull();
  });
});

describe('isLowLiquidityToMarketCapRatio', () => {
  it('flags a ratio below the threshold', () => {
    expect(
      isLowLiquidityToMarketCapRatio(LOW_LIQUIDITY_TO_MARKET_CAP_RATIO - 0.001),
    ).toBe(true);
  });

  it('does not flag a ratio exactly at the threshold', () => {
    expect(
      isLowLiquidityToMarketCapRatio(LOW_LIQUIDITY_TO_MARKET_CAP_RATIO),
    ).toBe(false);
  });

  it('does not flag a healthy ratio', () => {
    expect(isLowLiquidityToMarketCapRatio(0.18)).toBe(false);
  });

  it('flags a token with no liquidity at all', () => {
    expect(isLowLiquidityToMarketCapRatio(0)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])(
    'does not flag an unknown ratio (%s), which renders the dash',
    (_case, ratio) => {
      expect(isLowLiquidityToMarketCapRatio(ratio)).toBe(false);
    },
  );
});
