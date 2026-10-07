import React from 'react';
import type {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import type { TokenI } from '../../Tokens/types';
import PriceAdvanced from './Price.advanced';
import { PriceProvider } from './Price.context';
import { PriceHeader } from './Price.Header';
import { PriceChartSection } from './Price.Chart';

interface PriceSharedProps {
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  hasInsufficientCoverage?: boolean;
}

export type PriceProps = PriceSharedProps & {
  asset: TokenI;
  prices: TokenPrice[];
  timePeriod: TimePeriod;
  /**
   * Unused — only the retired `Price.legacy` chart ever read it. Still accepted
   * so existing callers compile; drop it once the upstream `useTokenPrice`
   * chain stops computing it.
   */
  chartNavigationButtons?: TimePeriod[];
  setTimePeriod?: (period: TimePeriod) => void;
  onPriceDirectionChange?: (isPositive: boolean) => void;
  useAmbientColor?: boolean;
};

/**
 * Token overview price header + chart.
 *
 * Renders the header and chart back to back. To place sections between them,
 * compose the parts directly:
 *
 * ```tsx
 * <Price.Provider {...priceProps}>
 *   <Price.Header />
 *   <MySection />
 *   <Price.Chart />
 * </Price.Provider>
 * ```
 */
const Price = (props: PriceProps) => {
  const { chartNavigationButtons, ...advancedProps } = props;

  return <PriceAdvanced {...advancedProps} />;
};

Price.Provider = PriceProvider;
Price.Header = PriceHeader;
Price.Chart = PriceChartSection;

export default Price;
