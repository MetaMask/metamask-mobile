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
  const initialParams =
    route.params?.screen === 'PredictMarketList'
      ? { entryPoint: route.params.params?.entryPoint }
      : undefined;

  return lane === 'kalshi' ? (
    <PredictNextStack key="kalshi" initialParams={initialParams} />
  ) : (
    <LegacyPredictScreenStack key="polymarket" />
  );
};

export default PredictRoot;
