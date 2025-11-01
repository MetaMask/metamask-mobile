import React from 'react';
import { PredictClaimAmount } from '../../predict-confirmations/predict-claim-amount';
import { PredictClaimBackground } from '../../predict-confirmations/predict-claim-background';
import { useModalNavbar } from '../../../hooks/ui/useNavbar';
import { usePredictClaimConfirmationMetrics } from '../../../hooks/metrics/usePredictClaimConfirmationMetrics';

export function PredictClaimInfo() {
  useModalNavbar();
  usePredictClaimConfirmationMetrics();

  return (
    <>
      <PredictClaimBackground />
      <PredictClaimAmount />
    </>
  );
}
