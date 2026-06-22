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
   * CAIP-19 asset id for the spot token. When present (spot positions on a
   * supported chain), the TradingView AdvancedChart is used; otherwise (perps
   * or unsupported chains) the legacy SVG chart renders.
   */
  assetId?: string;
  activeTimePeriod: TimePeriod;
  /** Crosshair % change while scrubbing the AdvancedChart (spot only). */
  onScrubPercentChange?: (percent: number | null) => void;
  /** When set, the AdvancedChart slides to center this trade (spot only). */
  focusRequest?: TradeFocusRequest;
}

const TraderPositionChartSection: React.FC<TraderPositionChartSectionProps> = ({
  historicalPrices,
  priceDiff,
  isPricesLoading,
  onChartIndexChange,
  trades,
  assetId,
  activeTimePeriod,
  onScrubPercentChange,
  focusRequest,
}) => (
  <PriceChartProvider>
    <Box twClassName="mx-4 my-3">
      {assetId ? (
        <TraderAdvancedChart
          assetId={assetId}
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
