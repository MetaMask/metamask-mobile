import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { PriceChartProvider } from '../../../../UI/AssetOverview/PriceChart/PriceChart.context';
import type { TimePeriod } from '../useTraderPositionData';
import TraderAdvancedChart, {
  type TradeFocusRequest,
} from './TraderAdvancedChart';
import TraderPriceChart from './TraderPriceChart';

export interface TraderPositionChartSectionProps {
  historicalPrices: TokenPrice[];
  priceDiff: number;
  isPricesLoading: boolean;
  onChartIndexChange: (index: number) => void;
  trades: readonly Trade[];
  /**
   * CAIP-19 asset id for the spot token. Present for spot positions on a supported
   * chain; absent for perps (which use {@link TraderPositionChartSectionProps.isPerp})
   * and unsupported chains (which fall back to the legacy SVG chart).
   */
  assetId?: string;
  /**
   * Hyperliquid perp position — render the AdvancedChart from `historicalPrices`
   * (no CAIP asset id / spot OHLCV feed).
   */
  isPerp?: boolean;
  activeTimePeriod: TimePeriod;
  /** Crosshair % change while scrubbing the AdvancedChart. */
  onScrubPercentChange?: (percent: number | null) => void;
  /** When set, the AdvancedChart slides to center this trade. */
  focusRequest?: TradeFocusRequest;
}

const TraderPositionChartSection: React.FC<TraderPositionChartSectionProps> = ({
  historicalPrices,
  priceDiff,
  isPricesLoading,
  onChartIndexChange,
  trades,
  assetId,
  isPerp,
  activeTimePeriod,
  onScrubPercentChange,
  focusRequest,
}) => (
  <PriceChartProvider>
    <Box twClassName="mx-4 my-3">
      {assetId || isPerp ? (
        <TraderAdvancedChart
          assetId={assetId}
          isPerp={isPerp}
          activeTimePeriod={activeTimePeriod}
          trades={trades}
          focusRequest={focusRequest}
          historicalPrices={historicalPrices}
          priceDiff={priceDiff}
          isPricesLoading={isPricesLoading}
          onChartIndexChange={onChartIndexChange}
          onScrubPercentChange={onScrubPercentChange}
        />
      ) : (
        <TraderPriceChart
          prices={historicalPrices}
          priceDiff={priceDiff}
          isLoading={isPricesLoading}
          onChartIndexChange={onChartIndexChange}
          trades={trades}
        />
      )}
    </Box>
  </PriceChartProvider>
);

export default TraderPositionChartSection;
