import React, { useCallback, useRef } from 'react';
import { BottomSheet, type BottomSheetRef } from '@metamask/design-system-react-native';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ConfirmMembershipContent } from './components/ConfirmMembershipContent';
import { ConfirmMembershipRequestData } from './ConfirmMembershipApproval.types';

const ConfirmMembershipApproval = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    // Cancel action goes here
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onConfirm();
    });
    // Approved action goes here
  }, [onConfirm]);

  if (approvalRequest?.type !== ApprovalTypes.CONFIRM_MEMBERSHIP) {
    return null;
  }

  const { monthlyAmount, totalAmount, renewDate, isTrial, billedOn } =
    (approvalRequest.requestData ?? {}) as Partial<ConfirmMembershipRequestData>;

  return (
    <BottomSheet ref={sheetRef} onClose={() => onReject()}>
      <ConfirmMembershipContent
        monthlyAmount={monthlyAmount ?? '0'}
        totalAmount={totalAmount ?? '0'}
        renewDate={renewDate ?? ''}
        isTrial={isTrial ?? false}
        billedOn={billedOn ?? ''}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </BottomSheet>
  );
};

export default ConfirmMembershipApproval;
