import { TokenI } from '../../../../Tokens/types';
import {
  TimePeriod,
  TokenPrice,
} from '../../../../../hooks/useTokenHistoricalPrices';

interface MarketData {
  pricePercentChange?: {
    PT1H?: number;
    P1D?: number;
    P7D?: number;
    P14D?: number;
    P30D?: number;
    P200D?: number;
    P1Y?: number;
    P3Y?: number;
    P1000Y?: number;
  };
}

interface CalculateAssetPriceParams {
  _asset: TokenI; // Prefix with underscore to indicate it's intentionally unused
  isEvmAssetSelected: boolean;
  exchangeRate?: number;
  tickerConversionRate?: number;
  prices: TokenPrice[];
  multichainAssetRates?: {
    rate: number;
    marketData?: MarketData;
  };
  timePeriod: TimePeriod;
}

interface CalculateAssetPriceResult {
  currentPrice: number;
  priceDiff: number;
  comparePrice: number;
  pricePercentChange?: number;
}

const TIME_PERIOD_TO_MARKET_DATA_KEY: Record<
  TimePeriod,
  keyof NonNullable<MarketData['pricePercentChange']>
> = {
  '1d': 'P1D',
  '1w': 'P7D',
  '7d': 'P7D',
  '1m': 'P30D',
  '3m': 'P200D',
  '1y': 'P1Y',
  '3y': 'P3Y',
  all: 'P1000Y',
};

export const calculateAssetPrice = ({
  isEvmAssetSelected,
  exchangeRate,
  tickerConversionRate,
  prices,
  multichainAssetRates,
  timePeriod,
}: CalculateAssetPriceParams): CalculateAssetPriceResult => {
  let currentPrice = 0;
  let priceDiff = 0;
  const comparePrice = prices[0]?.[1] || 0;
  let pricePercentChange: number | undefined;

  if (isEvmAssetSelected) {
    // EVM price calculation
    currentPrice =
      exchangeRate && tickerConversionRate
        ? exchangeRate * tickerConversionRate
        : 0;

    if (currentPrice !== undefined && currentPrice !== null) {
      priceDiff = currentPrice - comparePrice;
    }
  } else if (multichainAssetRates?.rate) {
    // Non-EVM price calculation - Use multichainAssetRates if available (primary source)
    currentPrice = multichainAssetRates.rate;
    priceDiff = currentPrice - comparePrice;

    // Get price percent change from market data
    const marketDataKey = TIME_PERIOD_TO_MARKET_DATA_KEY[timePeriod];
    pricePercentChange =
      multichainAssetRates.marketData?.pricePercentChange?.[marketDataKey];
  } else if (exchangeRate) {
    // Non-EVM fallback - use exchangeRate if multichainAssetRates not available
    // For non-EVM, exchangeRate is already in fiat (USD), so use directly
    currentPrice = exchangeRate;
    priceDiff = currentPrice - comparePrice;
  }
  // If no rate data available for non-EVM, priceDiff stays 0 (don't show misleading -100%)

  return {
    currentPrice,
    priceDiff,
    comparePrice,
    pricePercentChange,
  };
};
