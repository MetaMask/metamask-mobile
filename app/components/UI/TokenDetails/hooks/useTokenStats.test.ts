import { renderHook } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { useTokenStats } from './useTokenStats';
import { TokenStatKey } from '../constants/tokenStats';

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
    // Zoned, as the API sends it. Without the `Z` this parses as local time
    // and the late hour lands on the next UTC day in half the world.
    created: '2026-10-05T21:57:11Z',
    ...overrides,
  }) as TokenSecurityData;

const renderStats = (
  params: Partial<Parameters<typeof useTokenStats>[0]> = {},
) =>
  renderHook(() =>
    useTokenStats({
      marketData: buildMarketData(),
      isMarketDataLoading: false,
      securityData: buildSecurityData(),
      currentCurrency: 'usd',
      ...params,
    }),
  ).result.current;

describe('useTokenStats', () => {
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

  // Showing an unconverted dollar figure under a euro sign would be a wrong
  // reading rather than a missing one, so it is withheld.
  it('omits liquidity when the rate is underivable and the currency is not USD', () => {
    const stats = renderStats({ marketData: null, currentCurrency: 'eur' });

    expect(stats[TokenStatKey.Liquidity]?.value).toBeNull();
  });

  // A dollar is a dollar, so a user already on USD still gets their figure.
  it('shows liquidity unconverted when the rate is underivable but the currency is USD', () => {
    const stats = renderStats({ marketData: null, currentCurrency: 'usd' });

    expect(stats[TokenStatKey.Liquidity]?.value).toBe('$560.0K');
  });

  // Liquidity cannot be labelled before the rate arrives, so it waits with the
  // market-sourced cells rather than rendering a figure it has to correct.
  it('marks liquidity as loading alongside the market-sourced stats', () => {
    const stats = renderStats({
      marketData: null,
      isMarketDataLoading: true,
      currentCurrency: 'eur',
    });

    expect(stats[TokenStatKey.Liquidity]?.isLoading).toBe(true);
    expect(stats[TokenStatKey.Liquidity]?.value).toBeNull();
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

  it('marks only the stats that need market data as loading', () => {
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

  // The five stats only the Security tab shows. They moved here from
  // `securityFacts` so that every figure on either surface comes from one
  // place, even the ones the bar has no cell for.
  describe('the Security tab stats', () => {
    it('names the deepest market as the primary pool', () => {
      const stats = renderStats();

      expect(stats[TokenStatKey.PrimaryPool]?.value).toBe(
        'Uniswap \u00b7 X/WETH',
      );
    });

    // "Primary" is the largest reserve, which is a choice: `markets[]` carries
    // no primary-pool flag.
    it('picks the deepest of several markets', () => {
      const stats = renderStats({
        securityData: buildSecurityData({
          financialStats: {
            ...buildSecurityData().financialStats,
            markets: [
              {
                marketType: 'uniswap_v2',
                marketName: 'Shallow',
                pairName: 'X/WETH',
                reserveUSD: 10_000,
              },
              {
                marketType: 'uniswap_v2',
                marketName: 'Deep',
                pairName: 'X/USDC',
                reserveUSD: 900_000,
              },
            ],
          },
        }),
      });

      expect(stats[TokenStatKey.PrimaryPool]?.value).toBe('Deep \u00b7 X/USDC');
    });

    it('dashes the pool out when no markets came back', () => {
      const stats = renderStats({
        securityData: buildSecurityData({
          financialStats: {
            ...buildSecurityData().financialStats,
            markets: [],
          },
        }),
      });

      expect(stats[TokenStatKey.PrimaryPool]?.value).toBeNull();
    });

    it('keeps zero locked liquidity as a reading rather than a dash', () => {
      const stats = renderStats({
        securityData: buildSecurityData({
          financialStats: {
            ...buildSecurityData().financialStats,
            lockedLiquidityPct: 0,
          },
        }),
      });

      expect(stats[TokenStatKey.LpBurnedLocked]?.value).toBe('0.0%');
    });

    it('dashes LP locked out when the payload omits it', () => {
      const stats = renderStats();

      expect(stats[TokenStatKey.LpBurnedLocked]?.value).toBeNull();
    });

    // These four featureIds are ones Blockaid states explicitly, so "none
    // detected" is a real reading rather than an inference from silence.
    it('says none detected when no volume feature fired', () => {
      const stats = renderStats();

      expect(stats[TokenStatKey.VolumeFlags]?.value).toBe('None detected');
    });

    it('counts the volume flags that fired', () => {
      const stats = renderStats({
        securityData: buildSecurityData({
          features: [
            { featureId: 'WASH_TRADING', type: 'Warning', description: '' },
            { featureId: 'FAKE_VOLUME', type: 'Warning', description: '' },
          ],
        }),
      });

      expect(stats[TokenStatKey.VolumeFlags]?.value).toBe('2 detected');
    });

    it.each([
      [[{ featureId: 'LISTED_ON_CENTRALIZED_EXCHANGE' }], 'Yes'],
      [[], 'No'],
    ])('reports a centralized exchange listing as %#: %s', (features, word) => {
      const stats = renderStats({
        securityData: buildSecurityData({
          features: features.map((f) => ({
            ...f,
            type: 'Benign',
            description: '',
          })),
        }),
      });

      expect(stats[TokenStatKey.ListedOnExchange]?.value).toBe(word);
    });

    // Formatted in UTC: the API sends midnight UTC, so device-local
    // formatting would show the previous day everywhere west of Greenwich.
    it('formats the creation date on the day the API meant', () => {
      const stats = renderStats();

      expect(stats[TokenStatKey.Created]?.value).toBe('Oct 5, 2026');
    });

    it.each([['' as const], ['not-a-date']])(
      'dashes the date out for %p rather than rendering Invalid Date',
      (created) => {
        const stats = renderStats({
          securityData: buildSecurityData({ created }),
        });

        expect(stats[TokenStatKey.Created]?.value).toBeNull();
      },
    );
  });
});
