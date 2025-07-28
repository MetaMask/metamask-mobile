import React from 'react';

import { useTypedSignSimulationEnabled } from '../../../../hooks/signatures/useTypedSignSimulationEnabled';
import { isRecognizedPermit } from '../../../../utils/signature';
import { useSignatureRequest } from '../../../../hooks/signatures/useSignatureRequest';
import DecodedSimulation from './typed-sign-decoded';
import PermitSimulation from './typed-sign-permit';

const TypedSignV3V4Simulation: React.FC<object> = () => {
  const signatureRequest = useSignatureRequest();
  const isPermit = signatureRequest && isRecognizedPermit(signatureRequest);
  const isSimulationSupported = useTypedSignSimulationEnabled();

  if (!isSimulationSupported || !signatureRequest) {
    return null;
  }

  const { decodingData, decodingLoading } = signatureRequest;
  const hasValidDecodingData = !(
    (!decodingLoading && decodingData === undefined) ||
    decodingData?.error
  );

  if (!hasValidDecodingData && isPermit) {
    return <PermitSimulation />;
  }

  return <DecodedSimulation />;
};

export default TypedSignV3V4Simulation;
