import React from 'react';

import useTypesSignSimulationEnabled from '../../../../../hooks/useTypedSignSimulationEnabled';
import { isRecognizedPermit } from '../../../../../utils/signature';
import { useSignatureRequest } from '../../../../../hooks/useSignatureRequest';
import DecodedSimulation from './TypedSignDecoded';
import PermitSimulation from './TypedSignPermit';

const TypedSignV3V4Simulation: React.FC<object> = () => {
  const signatureRequest = useSignatureRequest();
  const isPermit = isRecognizedPermit(signatureRequest);
  const isSimulationSupported = useTypesSignSimulationEnabled();

  if (!isSimulationSupported || !signatureRequest) {
    return null;
  }

  const { decodingData, decodingLoading } = signatureRequest;
  const hasDecodingData = !(
    (!decodingLoading && decodingData === undefined) ||
    decodingData?.error
  );

  if (!hasDecodingData && isPermit) {
    return <PermitSimulation />;
  }

  return <DecodedSimulation />;
};

export default TypedSignV3V4Simulation;
