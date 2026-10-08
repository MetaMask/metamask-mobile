import { renderHook } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { useTokenStatBarStats } from './useTokenStatBarStats';
import { TokenStatKey } from '../components/V1/StatBar/StatBar.types';

const buildMarketData = (
  overrides: Partial<FungibleAssetPrice> = {},
): FungibleAssetPrice =>
  ({
    assetPriceType: 'fungible',
    lastUpdated: 0,
    price: 1,
    usdPrice: 1,
    marketCap: 12_400_000,
    totalVolume: 48_300_000,
    high1d: 0.04312,
    low1d: 0.039812,
    circulatingSupply: 12_400_000,
    ...overrides,
  }) as FungibleAssetPrice;

const buildSecurityData = (
  overrides: Partial<TokenSecurityData> = {},
): TokenSecurityData =>
  ({
    resultType: 'Benign',
    maliciousScore: '0',
    features: [],
    fees: { transfer: 0, transferFeeMaxAmount: null, buy: 0, sell: 0 },
    financialStats: {
      supply: 1_000_000,
      topHolders: [
        { label: '', name: null, address: '0x1', holdingPercentage: 10 },
        { label: '', name: null, address: '0x2', holdingPercentage: 8.4 },
      ],
      holdersCount: 12_900,
      tradeVolume24h: null,
      lockedLiquidityPct: null,
      markets: [
        {
          marketType: 'uniswap_v2',
          marketName: 'Uniswap',
          pairName: 'X/WETH',
          reserveUSD: 560_000,
        },
      ],
    },
    metadata: {
      externalLinks: {
        homepage: null,
        twitterPage: null,
        telegramChannelId: null,
      },
    },
    created: '2026-10-05T21:57:11',
    ...overrides,
  }) as TokenSecurityData;

const renderStats = (
  params: Partial<Parameters<typeof useTokenStatBarStats>[0]> = {},
) =>
  renderHook(() =>
    useTokenStatBarStats({
      marketData: buildMarketData(),
      isMarketDataLoading: false,
      securityData: buildSecurityData(),
      currentCurrency: 'usd',
      ...params,
    }),
  ).result.current;

describe('useTokenStatBarStats', () => {
  it('formats every stat from complete data', () => {
    const stats = renderStats();

    expect(stats[TokenStatKey.MarketCap]?.value).toBe('$12.4M');
    expect(stats[TokenStatKey.Liquidity]?.value).toBe('$560.0K');
    expect(stats[TokenStatKey.Volume24h]?.value).toBe('$48.3M');
    expect(stats[TokenStatKey.Holders]?.value).toBe('12.9K');
    expect(stats[TokenStatKey.Top10]?.value).toBe('18.4%');
    expect(stats[TokenStatKey.Tax]?.value).toBe('0% / 0%');
    expect(stats[TokenStatKey.CirculatingSupply]?.value).toBe('12.4M');
  });

  it('formats the 24h range with sub-unit precision', () => {
    const stats = renderStats();

    expect(stats[TokenStatKey.HighLow24h]?.value).toBe('$0.043120 / $0.039812');
  });

  // Liquidity over market cap, both in USD: 560k / 12.4m.
  it('computes Liq/MC from the USD figures on both sides', () => {
    const stats = renderStats();

    expect(stats[TokenStatKey.LiquidityToMarketCap]?.value).toBe('4.52%');
  });

  it('flags a thin pool as a warning', () => {
    const stats = renderStats();

    expect(stats[TokenStatKey.LiquidityToMarketCap]?.isWarning).toBe(true);
  });

  it('does not flag a deep pool as a warning', () => {
    const stats = renderStats({
      securityData: buildSecurityData({
        financialStats: {
          ...buildSecurityData().financialStats,
          markets: [
            {
              marketType: 'uniswap_v2',
              marketName: 'Uniswap',
              pairName: 'X/WETH',
              reserveUSD: 5_000_000,
            },
          ],
        },
      }),
    });

    expect(stats[TokenStatKey.LiquidityToMarketCap]?.isWarning).toBe(false);
  });

  // A ratio against a total-supply valuation is not comparable to one against
  // circulating supply, so an unknown supply yields no ratio at all.
  it('omits Liq/MC when circulating supply is unknown', () => {
    const stats = renderStats({
      marketData: buildMarketData({ circulatingSupply: undefined }),
    });

    expect(stats[TokenStatKey.LiquidityToMarketCap]?.value).toBeNull();
    expect(stats[TokenStatKey.LiquidityToMarketCap]?.isWarning).toBe(false);
  });

  it('converts USD liquidity into the selected currency', () => {
    // price over usdPrice gives 0.5 units of the selected currency per dollar.
    const stats = renderStats({
      marketData: buildMarketData({ price: 0.5, usdPrice: 1 }),
      currentCurrency: 'eur',
    });

    expect(stats[TokenStatKey.Liquidity]?.value).toBe('€280.0K');
  });

  it('falls back per stat when market data is absent entirely', () => {
    const stats = renderStats({ marketData: null });

    expect(stats[TokenStatKey.MarketCap]?.value).toBeNull();
    expect(stats[TokenStatKey.Volume24h]?.value).toBeNull();
    expect(stats[TokenStatKey.HighLow24h]?.value).toBeNull();
    expect(stats[TokenStatKey.CirculatingSupply]?.value).toBeNull();
    // Security-sourced stats are unaffected.
    expect(stats[TokenStatKey.Holders]?.value).toBe('12.9K');
    expect(stats[TokenStatKey.Top10]?.value).toBe('18.4%');
  });

  it('falls back per stat when security data is absent entirely', () => {
    const stats = renderStats({ securityData: null });

    expect(stats[TokenStatKey.Liquidity]?.value).toBeNull();
    expect(stats[TokenStatKey.Holders]?.value).toBeNull();
    expect(stats[TokenStatKey.Top10]?.value).toBeNull();
    expect(stats[TokenStatKey.Tax]?.value).toBeNull();
    // Market-sourced stats are unaffected.
    expect(stats[TokenStatKey.MarketCap]?.value).toBe('$12.4M');
  });

  // An undetermined sell fee is not a zero fee, and showing one side alone
  // would imply the other is free.
  it('omits tax when the sell fee is undetermined', () => {
    const stats = renderStats({
      securityData: buildSecurityData({
        fees: { transfer: 0, transferFeeMaxAmount: null, buy: 5, sell: null },
      }),
    });

    expect(stats[TokenStatKey.Tax]?.value).toBeNull();
  });

  it('keeps a decimal on a fractional fee', () => {
    const stats = renderStats({
      securityData: buildSecurityData({
        fees: { transfer: 0, transferFeeMaxAmount: null, buy: 2.5, sell: 3 },
      }),
    });

    expect(stats[TokenStatKey.Tax]?.value).toBe('2.5% / 3%');
  });

  it('omits the 24h range when only one end is known', () => {
    const stats = renderStats({
      marketData: buildMarketData({ low1d: undefined }),
    });

    expect(stats[TokenStatKey.HighLow24h]?.value).toBeNull();
  });

  it('marks only the market-sourced stats as loading', () => {
    const stats = renderStats({
      marketData: null,
      isMarketDataLoading: true,
    });

    expect(stats[TokenStatKey.MarketCap]?.isLoading).toBe(true);
    expect(stats[TokenStatKey.Volume24h]?.isLoading).toBe(true);
    expect(stats[TokenStatKey.HighLow24h]?.isLoading).toBe(true);
    expect(stats[TokenStatKey.CirculatingSupply]?.isLoading).toBe(true);
    expect(stats[TokenStatKey.Holders]?.isLoading).toBeUndefined();
    expect(stats[TokenStatKey.Tax]?.isLoading).toBeUndefined();
  });
});
