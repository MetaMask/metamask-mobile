import React from 'react';
import { useSelector } from 'react-redux';
import { selectPredictHomeFeaturedVariant } from '../../selectors/featureFlags';
import PredictHomeFeaturedCarousel from './PredictHomeFeaturedCarousel';
import PredictHomeFeaturedList from './PredictHomeFeaturedList';

interface PredictHomeFeaturedProps {
  testID?: string;
}

const PredictHomeFeatured: React.FC<PredictHomeFeaturedProps> = ({
  testID = 'predict-home-featured',
}) => {
  const variant = useSelector(selectPredictHomeFeaturedVariant);

  if (variant === 'list') {
    return <PredictHomeFeaturedList testID={testID} />;
  }

  return <PredictHomeFeaturedCarousel testID={testID} />;
};

export default PredictHomeFeatured;
