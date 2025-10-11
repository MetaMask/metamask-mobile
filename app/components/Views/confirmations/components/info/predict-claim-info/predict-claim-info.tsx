import React from 'react';
import { PredictClaimAmount } from '../../predict-confirmations/predict-claim-amount';
import { PredictClaimBackground } from '../../predict-confirmations/predict-claim-background';
import { useModalNavbar } from '../../../hooks/ui/useNavbar';

export function PredictClaimInfo() {
  useModalNavbar();

  return (
    <>
      <PredictClaimBackground />
      <PredictClaimAmount />
    </>
  );
}
