import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PredictNextStack from '../../PredictNext/navigation/PredictNextStack';
import { selectPredictConfig } from '../../PredictNext/selectors/predictConfig';
import LegacyPredictScreenStack from '../routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { resolvePredictRootLane } from './laneResolution';

const PredictRoot = () => {
  const config = useSelector(selectPredictConfig);
  const route = useRoute<RouteProp<RootStackParamList, 'Predict'>>();
  const lane = resolvePredictRootLane(config, route.params);

  return lane === 'kalshi' ? (
    <PredictNextStack key="kalshi" />
  ) : (
    <LegacyPredictScreenStack key="polymarket" />
  );
};

export default PredictRoot;
