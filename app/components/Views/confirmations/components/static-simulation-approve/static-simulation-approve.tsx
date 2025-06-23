import React from 'react';
import { Text } from 'react-native';

import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';
import { ApproveMethod } from '../../types/approve';

export const StaticSimulationApprove = () => {
  const { approveMethod } = useApproveTransactionData();

  return (
    <>
      {approveMethod === ApproveMethod.APPROVE && (
        <Text>StaticSimulationApprove</Text>
      )}
      {approveMethod === ApproveMethod.INCREASE_ALLOWANCE && (
        <Text>StaticSimulationIncreaseAllowance</Text>
      )}
      {approveMethod === ApproveMethod.DECREASE_ALLOWANCE && (
        <Text>StaticSimulationDecreaseAllowance</Text>
      )}
      {approveMethod === ApproveMethod.SET_APPROVAL_FOR_ALL && (
        <Text>StaticSimulationSetApprovalForAll</Text>
      )}
      {approveMethod === ApproveMethod.PERMIT2_APPROVE && (
        <Text>StaticSimulationPermit2Approve</Text>
      )}
    </>
  );
};
