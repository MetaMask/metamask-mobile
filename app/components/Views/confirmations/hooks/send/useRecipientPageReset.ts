import { useEffect, useRef } from 'react';

import { SOLANA_WALLET_SNAP_ID } from '../../../../../core/SnapKeyring/SolanaWalletSnap';
import useApprovalRequest, { ApprovalRequestType } from '../useApprovalRequest';

export const useRecipientPageReset = (resetRecipientPage: () => void) => {
  const request = useRef<ApprovalRequestType>();
  const { approvalRequest } = useApprovalRequest();

  useEffect(() => {
    if (approvalRequest && approvalRequest.origin === SOLANA_WALLET_SNAP_ID) {
      request.current = approvalRequest;
    } else if (request.current) {
      resetRecipientPage();
    }
  }, [approvalRequest, resetRecipientPage]);
};
