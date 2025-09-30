import React from 'react';
import { PayTokenAmountSkeleton } from '../pay-token-amount';
import { PayWithRowSkeleton } from '../rows/pay-with-row';
import InfoSection from '../UI/info-row/info-section';
import { CustomAmountSkeleton } from '../transactions/custom-amount';
import { DepositKeyboardSkeleton } from '../deposit-keyboard';

export function CustomAmountInfoSkeleton() {
  return (
    <>
      <CustomAmountSkeleton />
      <PayTokenAmountSkeleton />
      <InfoSection>
        <PayWithRowSkeleton />
      </InfoSection>
      <DepositKeyboardSkeleton />
    </>
  );
}
