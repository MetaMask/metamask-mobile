import { renderHook } from '@testing-library/react-native';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import type { TokenAssetMarketData } from '../queries/tokenAssetQuery';
import { useTokenPerformance } from './useTokenPerformance';

const marketData = (
  overrides: Partial<FungibleAssetPrice> = {},
): FungibleAssetPrice =>
  ({
    pricePercentChange1h: -0.52,
    pricePercentChange1d: 3.09,
    ...overrides,
  }) as FungibleAssetPrice;

const assetMarketData = (
  overrides: Partial<TokenAssetMarketData> = {},
): TokenAssetMarketData =>
  ({
    pricePercentChange5m: '1.25',
    pricePercentChange4h: '-4.5',
    ...overrides,
  }) as TokenAssetMarketData;

describe('useTokenPerformance', () => {
  it('maps spot-prices 1h and 24h percentages onto the cells', () => {
    const { result } = renderHook(() =>
      useTokenPerformance({
        marketData: marketData(),
        assetMarketData: null,
      }),
    );

    expect(result.current).toStrictEqual({
      fiveMinute: null,
      oneHour: -0.52,
      fourHour: null,
      twentyFourHour: 3.09,
    });
  });

  it('maps token-api 5m and 4h percentages onto the cells', () => {
    const { result } = renderHook(() =>
      useTokenPerformance({
        marketData: null,
        assetMarketData: assetMarketData(),
      }),
    );

    expect(result.current.fiveMinute).toBe(1.25);
    expect(result.current.fourHour).toBe(-4.5);
  });

  it('leaves every cell empty when neither source has an entry', () => {
    const { result } = renderHook(() =>
      useTokenPerformance({ marketData: null, assetMarketData: null }),
    );

    expect(result.current).toStrictEqual({
      fiveMinute: null,
      oneHour: null,
      fourHour: null,
      twentyFourHour: null,
    });
  });

  it('drops non-finite percentages from both sources', () => {
    const { result } = renderHook(() =>
      useTokenPerformance({
        marketData: marketData({
          pricePercentChange1h: Number.NaN,
          pricePercentChange1d: Number.POSITIVE_INFINITY,
        }),
        assetMarketData: assetMarketData({
          pricePercentChange5m: 'nope',
          pricePercentChange4h: '',
        }),
      }),
    );

    expect(result.current).toStrictEqual({
      fiveMinute: null,
      oneHour: null,
      fourHour: null,
      twentyFourHour: null,
    });
  });
});
