import React from 'react';
import { EditAmountSkeleton } from '../../../../components/edit-amount';
import { PayTokenAmountSkeleton } from '../../../../components/pay-token-amount';
import { PayWithRowSkeleton } from '../../../../components/rows/pay-with-row';
import InfoSection from '../../../../components/UI/info-row/info-section';

export function PerpsDepositSkeleton() {
  return (
    <EditAmountSkeleton>
      <PayTokenAmountSkeleton />
      <InfoSection>
        <PayWithRowSkeleton />
      </InfoSection>
    </EditAmountSkeleton>
  );
}
