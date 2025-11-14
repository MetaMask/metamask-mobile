import React from 'react';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import SectionCarrousel from '../components/SectionCarrousel/SectionCarrousel';

const PredictionSection = () => {
  const { marketData, isFetching } = usePredictMarketData({
    category: 'trending',
    pageSize: 6,
  });

  return (
    <SectionCarrousel
      sectionId="predictions"
      isLoading={isFetching || marketData?.length === 0}
      data={marketData}
      showPagination
      testIDPrefix="prediction-carousel"
    />
  );
};

export default PredictionSection;
