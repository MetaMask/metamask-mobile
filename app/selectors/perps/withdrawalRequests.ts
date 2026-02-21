import { createDeepEqualSelector } from '../util';
import { selectPerpsControllerState } from './base';
import { selectSelectedInternalAccountByScope } from '../multichainAccounts/accounts';
import { EVM_SCOPE } from '../../components/UI/Earn/constants/networks';

/**
 * Type definition for a withdrawal request.
 */
export interface WithdrawalRequest {
  id: string;
  amount: string;
  asset: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  success: boolean;
  txHash?: string;
  errorMessage?: string;
  accountAddress?: string;
  transactionId?: string;
}

// Empty array constant to avoid creating new references
const EMPTY_WITHDRAWAL_REQUESTS: WithdrawalRequest[] = [];

/**
 * Selects all withdrawal requests from PerpsController state.
 * Uses deep equality to prevent unnecessary re-renders.
 */
export const selectAllWithdrawalRequests = createDeepEqualSelector(
  selectPerpsControllerState,
  (perpsState) => perpsState?.withdrawalRequests ?? EMPTY_WITHDRAWAL_REQUESTS,
);

/**
 * Selects withdrawal requests filtered by the currently selected account.
 * Returns a stable empty array reference when no address is selected or no matching requests exist.
 * Uses deep equality comparison to prevent unnecessary re-renders.
 */
export const selectWithdrawalRequestsBySelectedAccount =
  createDeepEqualSelector(
    [selectAllWithdrawalRequests, selectSelectedInternalAccountByScope],
    (allWithdrawals, selectedAccountByScope) => {
      // Get the EVM account from the selected account group
      const selectedEvmAccount = selectedAccountByScope(EVM_SCOPE);
      const selectedAddress = selectedEvmAccount?.address;

      // Return stable empty array if no selected address
      if (!selectedAddress) {
        return EMPTY_WITHDRAWAL_REQUESTS;
      }

      const normalizedSelectedAddress = selectedAddress.toLowerCase();

      // Filter by current account
      const filtered = allWithdrawals.filter(
        (req) =>
          req.accountAddress?.toLowerCase() === normalizedSelectedAddress,
      );

      // Return stable empty array if no matching requests
      if (filtered.length === 0) {
        return EMPTY_WITHDRAWAL_REQUESTS;
      }

      return filtered;
    },
  );
