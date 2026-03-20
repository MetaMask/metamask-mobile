import { useMemo } from 'react';

import { isHardwareAccount } from '../../../../util/address';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import useApprovalRequest from './useApprovalRequest';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

/**
 * Determines whether the current confirmation originates from a Ledger account.
 *
 * Uses the `from` address on the approval request / transaction metadata
 * rather than the currently selected account so that edge cases where
 * they differ are handled correctly.
 */
export function useIsConfirmationFromLedgerAccount(): boolean {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  return useMemo(() => {
    const fromAddress =
      (approvalRequest?.requestData?.from as string) ||
      (transactionMetadata?.txParams?.from as string);
    if (!fromAddress) return false;
    return !!isHardwareAccount(fromAddress, [ExtendedKeyringTypes.ledger]);
  }, [approvalRequest?.requestData?.from, transactionMetadata?.txParams?.from]);
}
