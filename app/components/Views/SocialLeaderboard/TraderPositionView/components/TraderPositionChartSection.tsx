import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import PriceChart from '../../../../UI/AssetOverview/PriceChart';
import { PriceChartProvider } from '../../../../UI/AssetOverview/PriceChart/PriceChart.context';

export interface TraderPositionChartSectionProps {
  historicalPrices: TokenPrice[];
  priceDiff: number;
  isPricesLoading: boolean;
  onChartIndexChange: (index: number) => void;
}

const TraderPositionChartSection: React.FC<TraderPositionChartSectionProps> = ({
  historicalPrices,
  priceDiff,
  isPricesLoading,
  onChartIndexChange,
}) => (
  <PriceChartProvider>
    <Box twClassName="mx-4 my-3">
      <PriceChart
        prices={historicalPrices}
        priceDiff={priceDiff}
        isLoading={isPricesLoading}
        onChartIndexChange={onChartIndexChange}
      />
    </Box>
  </PriceChartProvider>
);

export default TraderPositionChartSection;
