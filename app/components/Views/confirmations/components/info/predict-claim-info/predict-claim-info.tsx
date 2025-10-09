import React from 'react';
import { AmountHighlight } from '../../transactions/amount-highlight';
import { PredictClaimBackground } from '../../predict-confirmations/predict-claim-background';
import { useModalNavbar } from '../../../hooks/ui/useNavbar';

export function PredictClaimInfo() {
  useModalNavbar();

  return (
    <>
      <PredictClaimBackground />
      <AmountHighlight />
    </>
  );
}
