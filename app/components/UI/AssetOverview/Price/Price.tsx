import React from 'react';
import type {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import type { TokenI } from '../../Tokens/types';
import PriceAdvanced from './Price.advanced';

interface PriceSharedProps {
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  hasInsufficientCoverage?: boolean;
}

/**
 * Token overview price header + chart. Renders the advanced chart by default and
 * falls back to {@link PriceLegacy} when OHLCV data is unavailable.
 */
export type PriceProps = PriceSharedProps & {
  asset: TokenI;
  prices: TokenPrice[];
  timePeriod: TimePeriod;
  chartNavigationButtons?: TimePeriod[];
  setTimePeriod?: (period: TimePeriod) => void;
  onPriceDirectionChange?: (isPositive: boolean) => void;
  useAmbientColor?: boolean;
};

const Price = (props: PriceProps) => {
  const {
    asset,
    prices,
    timePeriod,
    isLoading,
    chartNavigationButtons,
    setTimePeriod,
    currentPrice,
    currentCurrency,
    ...rest
  } = props;

  return (
    <PriceAdvanced
      asset={asset}
      prices={prices}
      timePeriod={timePeriod}
      chartNavigationButtons={chartNavigationButtons}
      setTimePeriod={setTimePeriod}
      isLoading={isLoading}
      currentPrice={currentPrice}
      currentCurrency={currentCurrency}
      {...rest}
    />
  );
};

export default Price;
