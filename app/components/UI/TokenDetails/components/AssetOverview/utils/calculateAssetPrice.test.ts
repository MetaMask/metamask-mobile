import { calculateAssetPrice } from './calculateAssetPrice';
import { TokenI } from '../../../../Tokens/types';
import { TokenPrice } from '../../../../../hooks/useTokenHistoricalPrices';

const mockAsset: TokenI = {
  name: 'Ethereum',
  ticker: 'ETH',
  symbol: 'Ethereum',
  address: '0x0',
  aggregators: [],
  decimals: 18,
  image: '',
  balance: '100',
  balanceFiat: '$100',
  logo: '',
  isETH: true,
  isNative: true,
};

const mockPrices: TokenPrice[] = [
  ['1736761237983', 100],
  ['1736761237986', 105],
];

describe('calculateAssetPrice', () => {
  it('should calculate EVM asset price correctly', () => {
    const result = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: true,
      exchangeRate: 2000,
      tickerConversionRate: 1.5,
      prices: mockPrices,
      timePeriod: '1d',
    });

    expect(result).toEqual({
      currentPrice: 3000, // 2000 * 1.5
      priceDiff: 2900, // 3000 - 100
      comparePrice: 100,
      pricePercentChange: undefined,
    });
  });

  it('should calculate non-EVM asset price correctly with price percent change', () => {
    const result = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: false,
      prices: mockPrices,
      timePeriod: '1d',
      multichainAssetRates: {
        rate: 2500,
        marketData: {
          pricePercentChange: {
            P1D: 4.5,
            P7D: 13.8,
            P30D: 5.7,
          },
        },
      },
    });

    expect(result).toEqual({
      currentPrice: 2500,
      priceDiff: 2400, // 2500 - 100
      comparePrice: 100,
      pricePercentChange: 4.5, // P1D for 1d timePeriod
    });
  });

  it('should handle missing rates', () => {
    const result = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: true,
      prices: mockPrices,
      timePeriod: '1d',
    });

    expect(result).toEqual({
      currentPrice: 0,
      priceDiff: -100, // 0 - 100
      comparePrice: 100,
      pricePercentChange: undefined,
    });
  });

  it('should handle missing multichain rates', () => {
    const result = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: false,
      prices: mockPrices,
      timePeriod: '1d',
    });

    expect(result).toEqual({
      currentPrice: 0,
      priceDiff: 0,
      comparePrice: 100,
      pricePercentChange: undefined,
    });
  });

  it('should fallback to exchangeRate for non-EVM when multichainAssetRates is unavailable', () => {
    const result = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: false,
      exchangeRate: 1800, // Fallback rate in fiat (USD)
      prices: mockPrices,
      timePeriod: '1d',
    });

    expect(result).toEqual({
      currentPrice: 1800,
      priceDiff: 1700, // 1800 - 100
      comparePrice: 100,
      pricePercentChange: undefined, // No market data available
    });
  });

  it('should handle different time periods for price percent change', () => {
    const multichainAssetRates = {
      rate: 2500,
      marketData: {
        pricePercentChange: {
          P1D: 4.5,
          P7D: 13.8,
          P30D: 5.7,
          P200D: 6.3,
          P1Y: -4.0,
        },
      },
    };

    const result1d = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: false,
      prices: mockPrices,
      timePeriod: '1d',
      multichainAssetRates,
    });

    const result1w = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: false,
      prices: mockPrices,
      timePeriod: '1w',
      multichainAssetRates,
    });

    const result1m = calculateAssetPrice({
      _asset: mockAsset,
      isEvmAssetSelected: false,
      prices: mockPrices,
      timePeriod: '1m',
      multichainAssetRates,
    });

    expect(result1d.pricePercentChange).toBe(4.5); // P1D
    expect(result1w.pricePercentChange).toBe(13.8); // P7D
    expect(result1m.pricePercentChange).toBe(5.7); // P30D
  });
});
