import React from 'react';

import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';
import { ApproveMethod } from '../../types/approve';
import { StaticSimulationApproveMethod } from './static-simulation-approve-method';
import { StaticSimulationIncreaseAllowanceMethod } from './static-simulation-increase-allowance-method';
import { StaticSimulationDecreaseAllowanceMethod } from './static-simulation-decrease-allowance-method';
import { StaticSimulationSetApprovalForAllMethod } from './static-simulation-set-approval-for-all-method';
import { StaticSimulationPermit2ApproveMethod } from './static-simulation-permit2-approve-method';

export const StaticSimulationApprove = () => {
  const { approveMethod } = useApproveTransactionData();

  return (
    <>
      {approveMethod === ApproveMethod.APPROVE && (
        <StaticSimulationApproveMethod />
      )}
      {approveMethod === ApproveMethod.INCREASE_ALLOWANCE && (
        <StaticSimulationIncreaseAllowanceMethod />
      )}
      {approveMethod === ApproveMethod.DECREASE_ALLOWANCE && (
        <StaticSimulationDecreaseAllowanceMethod />
      )}
      {approveMethod === ApproveMethod.SET_APPROVAL_FOR_ALL && (
        <StaticSimulationSetApprovalForAllMethod />
      )}
      {approveMethod === ApproveMethod.PERMIT2_APPROVE && (
        <StaticSimulationPermit2ApproveMethod />
      )}
    </>
  );
};
