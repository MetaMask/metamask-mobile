import React from 'react';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { useApproveTransactionData } from '../../../../hooks/useApproveTransactionData';
import { ApproveMethod } from '../../../../types/approve';
import { ApproveAndPermit2 } from '../../../approve-static-simulations/approve-and-permit2';
import { SetApprovalForAll } from '../../../approve-static-simulations/set-approval-for-all';
import { IncreaseDecreaseAllowance } from '../../../approve-static-simulations/increase-decrease-allowance';
import { StaticSimulationLayout } from '../../../UI/static-simulation-layout';

export const ApproveRow = () => {
  const { approveMethod, isLoading } = useApproveTransactionData();

  return (
    <StaticSimulationLayout
      isLoading={isLoading}
      testID={ConfirmationRowComponentIDs.APPROVE_ROW}
    >
      {(approveMethod === ApproveMethod.APPROVE ||
        approveMethod === ApproveMethod.PERMIT2_APPROVE) && (
        <ApproveAndPermit2 />
      )}
      {approveMethod === ApproveMethod.SET_APPROVAL_FOR_ALL && (
        <SetApprovalForAll />
      )}
      {(approveMethod === ApproveMethod.INCREASE_ALLOWANCE ||
        approveMethod === ApproveMethod.DECREASE_ALLOWANCE) && (
        <IncreaseDecreaseAllowance />
      )}
    </StaticSimulationLayout>
  );
};
