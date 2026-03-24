import React from 'react';
import { useSelector } from 'react-redux';
import { selectPredictHomeFeaturedVariant } from '../../selectors/featureFlags';
import PredictHomeFeaturedCarousel from './PredictHomeFeaturedCarousel';
import PredictHomeFeaturedList from './PredictHomeFeaturedList';
import { PREDICT_HOME_FEATURED_TEST_IDS } from './PredictHomeFeatured.testIds';

interface PredictHomeFeaturedProps {
  testID?: string;
}

const PredictHomeFeatured: React.FC<PredictHomeFeaturedProps> = ({
  testID = PREDICT_HOME_FEATURED_TEST_IDS.FEATURED,
}) => {
  const variant = useSelector(selectPredictHomeFeaturedVariant);

  if (variant === 'list') {
    return <PredictHomeFeaturedList testID={testID} />;
  }

  return <PredictHomeFeaturedCarousel testID={testID} />;
};

export default PredictHomeFeatured;
