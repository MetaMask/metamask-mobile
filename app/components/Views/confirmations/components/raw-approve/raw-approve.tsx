import React from 'react';

import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';
import { ApproveMethod } from '../../types/approve';
import { RawApproveMethod } from './raw-approve-method';
import { RawIncreaseAllowanceMethod } from './raw-increase-allowance-method';
import { RawDecreaseAllowanceMethod } from './raw-decrease-allowance-method';
import { RawSetApprovalForAllMethod } from './raw-set-approval-for-all-method';
import { RawPermit2ApproveMethod } from './raw-permit2-approve-method';

export const RawApprove = () => {
  const { approveMethod } = useApproveTransactionData();

  return (
    <>
      {approveMethod === ApproveMethod.APPROVE && <RawApproveMethod />}
      {approveMethod === ApproveMethod.INCREASE_ALLOWANCE && (
        <RawIncreaseAllowanceMethod />
      )}
      {approveMethod === ApproveMethod.DECREASE_ALLOWANCE && (
        <RawDecreaseAllowanceMethod />
      )}
      {approveMethod === ApproveMethod.SET_APPROVAL_FOR_ALL && (
        <RawSetApprovalForAllMethod />
      )}
      {approveMethod === ApproveMethod.PERMIT2_APPROVE && (
        <RawPermit2ApproveMethod />
      )}
    </>
  );
};
