import { useMemo } from 'react';

import { isHardwareAccount } from '../../../util/address';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import useApprovalRequest from '../../../components/Views/confirmations/hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../components/Views/confirmations/hooks/transactions/useTransactionMetadataRequest';

export function useIsConfirmationFromQrAccount(): boolean {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  return useMemo(() => {
    const fromAddress =
      (approvalRequest?.requestData?.from as string) ||
      (transactionMetadata?.txParams?.from as string);
    if (!fromAddress) return false;
    return !!isHardwareAccount(fromAddress, [ExtendedKeyringTypes.qr]);
  }, [approvalRequest?.requestData?.from, transactionMetadata?.txParams?.from]);
}
