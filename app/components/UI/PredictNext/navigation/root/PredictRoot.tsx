import React from 'react';
import PredictNextStack from '../PredictNextStack';
import { PredictImplementationSwitch } from '../../implementation';
import PredictPrototypeStack, {
  PREDICT_PROTOTYPE_ENABLED,
} from '../../prototype/PredictPrototypeStack';
import LegacyPredictScreenStack from '../../../Predict/routes';

const PredictRoot = () => {
  if (PREDICT_PROTOTYPE_ENABLED) {
    return <PredictPrototypeStack />;
  }

  return (
    <PredictImplementationSwitch
      legacy={<LegacyPredictScreenStack />}
      next={<PredictNextStack />}
      resolving={null}
    />
  );
};

export default PredictRoot;
