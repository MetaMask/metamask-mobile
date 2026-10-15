import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ConfirmMembershipContent } from './components/ConfirmMembershipContent';
import { ConfirmMembershipRequestData } from './ConfirmMembershipApproval.types';

const ConfirmMembershipApproval = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onConfirm();
    });
  }, [onConfirm]);

  if (approvalRequest?.type !== ApprovalTypes.CONFIRM_MEMBERSHIP) {
    return null;
  }

  const { monthlyAmount, totalAmount, renewDate, isTrial, billedOn } =
    (approvalRequest.requestData ??
      {}) as Partial<ConfirmMembershipRequestData>;

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={(hasPendingAction) => {
        // `hasPendingAction` is true when the sheet is closing because
        // `onCloseBottomSheet` was called with a callback (i.e. the confirm
        // path above) — `onClose` still fires in that case, so this guard
        // keeps a confirm from also triggering a reject for the same request.
        if (!hasPendingAction) {
          onReject();
        }
      }}
    >
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
