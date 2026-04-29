import React from 'react';
import { useSelector } from 'react-redux';
import type {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import type { TokenI } from '../../Tokens/types';
import { selectTokenOverviewAdvancedChartEnabled } from '../../../../selectors/featureFlagController/tokenOverviewAdvancedChart';
import PriceAdvanced from './Price.advanced';
import PriceLegacy from './Price.legacy';

interface PriceSharedProps {
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
}

/**
 * Token overview price header + chart. Passes both legacy (`prices`, `timePeriod`) and
 * advanced (`asset`) data; the remote flag {@link selectTokenOverviewAdvancedChartEnabled}
 * chooses which implementation to render.
 */
export type PriceProps = PriceSharedProps & {
  asset: TokenI;
  prices: TokenPrice[];
  timePeriod: TimePeriod;
  chartNavigationButtons?: TimePeriod[];
  setTimePeriod?: (period: TimePeriod) => void;
};

const Price = (props: PriceProps) => {
  const isAdvancedChartEnabled = useSelector(
    selectTokenOverviewAdvancedChartEnabled,
  );
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

  if (isAdvancedChartEnabled) {
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
  }
  return (
    <PriceLegacy
      prices={prices}
      timePeriod={timePeriod}
      chartNavigationButtons={chartNavigationButtons}
      onTimePeriodChange={setTimePeriod}
      isLoading={isLoading}
      currentPrice={currentPrice}
      currentCurrency={currentCurrency}
      {...rest}
    />
  );
};

export default Price;
