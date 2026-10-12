import React from 'react';
import { TokenI } from '../../Tokens/types';
import type {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import { PriceProvider } from './Price.context';
import { PriceHeader } from './Price.Header';
import { PriceChartSection } from './Price.Chart';

export interface PriceAdvancedProps {
  asset: TokenI;
  currentPrice: number;
  currentCurrency: string;
  /** Historical-prices change, used for the line-mode title and as the candle fallback. */
  priceDiff: number;
  /** Historical-prices reference price, used for the line-mode title. */
  comparePrice: number;
  isLoading: boolean;
  /** Historical Prices API series; drives the line chart. Candles come from OHLCV. */
  prices?: TokenPrice[];
  timePeriod?: TimePeriod;
  setTimePeriod?: (period: TimePeriod) => void;
  onPriceDirectionChange?: (isPositive: boolean) => void;
  useAmbientColor?: boolean;
  hasInsufficientCoverage?: boolean;
}

/**
 * Default composition of the price header and chart. Callers that need to place
 * their own sections between the two should compose `Price.Provider`,
 * `Price.Header`, and `Price.Chart` directly.
 */
const PriceAdvanced = (props: PriceAdvancedProps) => (
  <PriceProvider {...props}>
    <PriceHeader />
    <PriceChartSection />
  </PriceProvider>
);

export default PriceAdvanced;
