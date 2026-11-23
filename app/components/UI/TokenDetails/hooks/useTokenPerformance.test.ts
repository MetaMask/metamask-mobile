import { renderHook } from '@testing-library/react-native';
import type { TokenMarketData } from '../queries/tokenMarketData';
import { useTokenPerformance } from './useTokenPerformance';

const marketData = (
  overrides: Partial<TokenMarketData> = {},
): TokenMarketData =>
  ({
    pricePercentChange5m: 1.25,
    pricePercentChange1h: -0.52,
    pricePercentChange4h: -4.5,
    pricePercentChange1d: 3.09,
    ...overrides,
  }) as TokenMarketData;

describe('useTokenPerformance', () => {
  it('maps spot-prices percentages onto the cells', () => {
    const { result } = renderHook(() =>
      useTokenPerformance({
        marketData: marketData(),
      }),
    );

    expect(result.current).toStrictEqual({
      fiveMinute: 1.25,
      oneHour: -0.52,
      fourHour: -4.5,
      twentyFourHour: 3.09,
    });
  });

  it('leaves every cell empty when market data is missing', () => {
    const { result } = renderHook(() =>
      useTokenPerformance({ marketData: null }),
    );

    expect(result.current).toStrictEqual({
      fiveMinute: null,
      oneHour: null,
      fourHour: null,
      twentyFourHour: null,
    });
  });

  it('drops non-finite percentages', () => {
    const { result } = renderHook(() =>
      useTokenPerformance({
        marketData: marketData({
          pricePercentChange5m: Number.NaN,
          pricePercentChange1h: Number.NaN,
          pricePercentChange4h: Number.POSITIVE_INFINITY,
          pricePercentChange1d: Number.POSITIVE_INFINITY,
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
