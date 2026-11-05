import React from 'react';
import PredictNextStack from '../PredictNextStack';
import { PredictImplementationSwitch } from '../../implementation';
import LegacyPredictScreenStack from '../../../Predict/routes';

const PredictRoot = () => (
  <PredictImplementationSwitch
    legacy={<LegacyPredictScreenStack />}
    next={<PredictNextStack />}
    resolving={null}
  />
);

export default PredictRoot;
