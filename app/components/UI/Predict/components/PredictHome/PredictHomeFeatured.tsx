import React from 'react';
import PredictPositionEmpty from '../PredictPositionEmpty';

interface PredictHomeFeaturedProps {
  testID?: string;
}

const PredictHomeFeatured: React.FC<PredictHomeFeaturedProps> = ({
  testID = 'predict-home-featured',
}) => <PredictPositionEmpty testID={testID} />;

export default PredictHomeFeatured;
