import { useMemo } from 'react';

import { isHardwareAccount } from '../../../../util/address';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import useApprovalRequest from './useApprovalRequest';
import { useTransactionPayingAccount } from './transactions/useTransactionPayingAccount';

/**
 * Determines whether the current confirmation is signed by a Ledger account.
 *
 * Uses the paying account rather than the currently selected account so that
 * edge cases where they differ are handled correctly.
 */
export function useIsConfirmationFromLedgerAccount(): boolean {
  const { approvalRequest } = useApprovalRequest();
  const payingAccount = useTransactionPayingAccount();

  return useMemo(() => {
    const fromAddress =
      payingAccount || (approvalRequest?.requestData?.from as string);
    if (!fromAddress) return false;
    return !!isHardwareAccount(fromAddress, [ExtendedKeyringTypes.ledger]);
  }, [approvalRequest?.requestData?.from, payingAccount]);
}
