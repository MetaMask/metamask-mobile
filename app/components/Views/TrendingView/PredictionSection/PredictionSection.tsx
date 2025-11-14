import { Box } from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import { PredictEventValues } from '../../../UI/Predict/constants/eventNames';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';
import SectionHeader from '../components/SectionHeader/SectionHeader';
import SectionCarrousel from '../components/SectionCarrousel/SectionCarrousel';

const PredictionSection = () => {
  // Fetch prediction market data with limit of 6
  const { marketData, isFetching } = usePredictMarketData({
    category: 'trending',
    pageSize: 6,
  });

  const marketDataLength = marketData?.length ?? 0;

  const renderPredictMarket = useCallback(
    (item: PredictMarketType, index: number) => (
      <PredictMarket
        market={item}
        entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
        testID={`prediction-carousel-card-${index + 1}`}
      />
    ),
    [],
  );

  const renderSkeleton = useCallback(
    (_item: number, _index: number) => (
      <PredictMarketSkeleton testID="prediction-carousel-skeleton" />
    ),
    [],
  );

  // Show loading state while fetching
  if (isFetching) {
    return (
      <Box twClassName="mb-6">
        <SectionHeader sectionId="predictions" />
        <SectionCarrousel
          data={[1, 2, 3]}
          renderItem={renderSkeleton}
          keyExtractor={(item) => `skeleton-${item}`}
          showPagination
          testIDPrefix="prediction-carousel"
        />
      </Box>
    );
  }

  // Show empty state when no data
  if (marketDataLength === 0) {
    return null; // Don't show the section if there are no predictions
  }

  return (
    <Box twClassName="mb-6">
      <SectionHeader sectionId="predictions" />
      <SectionCarrousel
        data={marketData ?? []}
        renderItem={renderPredictMarket}
        keyExtractor={(item) => item.id}
        showPagination
        testIDPrefix="prediction-carousel"
      />
    </Box>
  );
};

export default PredictionSection;
