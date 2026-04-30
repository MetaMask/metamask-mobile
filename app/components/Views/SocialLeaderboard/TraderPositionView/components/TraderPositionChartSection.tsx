import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { PriceChartProvider } from '../../../../UI/AssetOverview/PriceChart/PriceChart.context';
import TraderPriceChart from './TraderPriceChart';

export interface TraderPositionChartSectionProps {
  historicalPrices: TokenPrice[];
  priceDiff: number;
  isPricesLoading: boolean;
  onChartIndexChange: (index: number) => void;
  trades: readonly Trade[];
}

const TraderPositionChartSection: React.FC<TraderPositionChartSectionProps> = ({
  historicalPrices,
  priceDiff,
  isPricesLoading,
  onChartIndexChange,
  trades,
}) => (
  <PriceChartProvider>
    <Box twClassName="mx-4 my-3">
      <TraderPriceChart
        prices={historicalPrices}
        priceDiff={priceDiff}
        isLoading={isPricesLoading}
        onChartIndexChange={onChartIndexChange}
        trades={trades}
      />
    </Box>
  </PriceChartProvider>
);

export default TraderPositionChartSection;
