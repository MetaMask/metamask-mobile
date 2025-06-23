import React from 'react';
import { Text } from 'react-native';

import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';
import { ApproveMethod } from '../../types/approve';

export const RawApprove = () => {
  const { approveMethod } = useApproveTransactionData();

  return (
    <>
      {approveMethod === ApproveMethod.APPROVE && <Text>RawApprove</Text>}
      {approveMethod === ApproveMethod.INCREASE_ALLOWANCE && (
        <Text>RawIncreaseAllowance</Text>
      )}
      {approveMethod === ApproveMethod.DECREASE_ALLOWANCE && (
        <Text>RawDecreaseAllowance</Text>
      )}
      {approveMethod === ApproveMethod.SET_APPROVAL_FOR_ALL && (
        <Text>RawSetApprovalForAll</Text>
      )}
      {approveMethod === ApproveMethod.PERMIT2_APPROVE && (
        <Text>RawPermit2Approve</Text>
      )}
    </>
  );
};
