import { useMemo } from 'react';

import { isHardwareAccount } from '../../../../util/address';
import useApprovalRequest from './useApprovalRequest';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

/**
 * Determines whether the current confirmation originates from a hardware
 * wallet account (Ledger or QR).
 *
 * Both hardware transports now use the unified awaiting-confirmation flow in
 * the hardware wallet bottom sheet. QR-specific UI is rendered inside that
 * state when a SIGN request becomes available.
 */
export function useIsConfirmationFromHardwareWalletAccount(): boolean {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  return useMemo(() => {
    const fromAddress =
      (approvalRequest?.requestData?.from as string) ||
      (transactionMetadata?.txParams?.from as string);
    if (!fromAddress) return false;
    return !!isHardwareAccount(fromAddress);
  }, [approvalRequest?.requestData?.from, transactionMetadata?.txParams?.from]);
}

export const useIsConfirmationFromLedgerAccount =
  useIsConfirmationFromHardwareWalletAccount;
