import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import PredictNextStack from '../PredictNextStack';
import { PredictImplementationSwitch } from '../../implementation';
import LegacyPredictScreenStack from '../../../Predict/routes';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { resolvePinnedVenue } from './laneResolution';

const PredictRoot = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Predict'>>();

  return (
    <PredictImplementationSwitch
      pinnedVenue={resolvePinnedVenue(route.params)}
      legacy={<LegacyPredictScreenStack />}
      next={<PredictNextStack />}
      resolving={null}
    />
  );
};

export default PredictRoot;
